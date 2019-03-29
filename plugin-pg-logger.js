const bodyParser = require('body-parser');
const Future = require("junk-bucket/future");

async function pluginLogger( router, loggerPlugin, context ){
	const contexts = {};

	router.all("/LogDriver.StartLogging", async (req, resp) => {
		try {
			//extract the fields
			const body = req.body;
			const sourceSocket = body.File;
			const meta = body.Info;
			context.logger.info("Request info", {body});

			//Record the new context
			const loggingContext = context.subcontext(sourceSocket);
			contexts[sourceSocket] = loggingContext;

			//Nothing the logger plugin
			try {
				context.logger.info("Invoking plugin", { sourceSocket });
				await loggerPlugin( sourceSocket, loggingContext, body );
				context.logger.info("Completed logging plug-in notifying completion", { sourceSocket });
				resp.json({});
			} catch(e) {
				context.logger.info("Logger plugin failed", { e });
				resp.json({Err: e.toString()});

				delete contexts[sourceSocket];
			}
		} catch( e ) {
			context.logger.info("Failed to start logging", { e });
			resp.json({ Err: e.toString() + "\nStack: " + e.stack.join("\n") });
		}
	});

	router.all("/LogDriver.StopLogging", async (req,resp) => {
		//Parse Request
		const body = req.body;
		const sourceSocket = body.File;

		//Find context
		const loggingContext = contexts[sourceSocket];
		//Terminate context
		try {
			await loggingContext.cleanup();
			resp.json({});
		}catch(e){
			resp.json({Err: e.toString()})
		} finally {
			delete contexts[sourceSocket];
		}
	});
}

const {LengthPrefixedFrameIngress} = require("./length-framed");
const {protobufParsingStream, DockerLogEntryInternalizer} = require("./entry-parser");
const {newContainerSink} = require("./pg-sink");
const fs = require("fs");
const assert = require("assert");

async function consumeLogging( sourceSocket, context, meta, pool, driverID ){
	assert( pool );
	const logger = context.logger;
	//Load the protocol buffers
	const parser = await protobufParsingStream(__dirname + "/entry.proto", context.logger.child({istream: "protobuf"}) );
	const framing = new LengthPrefixedFrameIngress( {}, context.logger.child({istream: "frame parser"}) );
	const logEntryInternalizer = new DockerLogEntryInternalizer( context.logger.child({istream: "LogEntry internalizer"}) );
	const databaseSink = await newContainerSink( pool, meta, context.logger.child({istream: "pg-sink"}), driverID );

	//Connect to the socket
	const pipe = fs.createReadStream(sourceSocket);
	pipe.on("error", (e) =>{
		logger.error("Unable to connect to the socket", e);
	});
	logger.info("Uncorking FIFO");
	pipe.pipe(framing).pipe(parser).pipe(logEntryInternalizer).pipe(databaseSink);


	//Attach to the context
	context.onCleanup(() => {
		pipe.close();
		context.logger.info("Cleaning up");
	});
}

const {Context} = require("junk-bucket/context");
const express = require("express");
const pg = require("pg/lib");

async function newDriverInstance( pool ) {
	const insertResponse = await pool.query("INSERT INTO driver_instances (created_at) VALUES (now()) RETURNING id", []);
	const driverID = insertResponse.rows[0].id;
	return driverID;
}


async function mobyPostgresLogger( context ){
	const stdLogger = context.logger;
	const socketFileName = context.socket;

	stdLogger.info("Starting Postgres sink");
	//Connect to the data stores
	const pool = new pg.Pool(context.pg_config);
	const logger = stdLogger;
	const driverID = await newDriverInstance(pool);

	//Context
	const serviceContext = new Context("docker-logger", logger );
	//Create the server
	const application = express();
	application.use(bodyParser.json({
		type: (req) => true
	}));
	pluginLogger(application, async (sourceSocket, context, meta ) => {
		logger.info("Launching consumer", {sourceSocket});
		await consumeLogging(sourceSocket, context, meta, pool, driverID );
		logger.info("Consumer is complete", {sourceSocket});
	}, serviceContext);

	const listeningPromise = new Future();
	const socket = application.listen(socketFileName, function () {
		logger.info("Listening on socket", {socketFileName});
		listeningPromise.accept({
			close: async () =>{
				logger.info("Shutting down socket", {socketFileName});
				socket.close();
				await pool.end();
				logger.info("Done", {socketFileName});
			},
			id: driverID
		});
	});
	context.onCleanup(async () => {
		await socket.close();
	});
	return listeningPromise.promised;
}

module.exports = {
	mobyPostgresLogger
};
