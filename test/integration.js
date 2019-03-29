const {expect} = require("chai");
const {Context} = require("junk-bucket/context");
const {contextTemporaryDirectory} = require("junk-bucket/fs");
const {defaultNullLogger} = require("junk-bucket/logging");
const {delay} = require("junk-bucket/future");

const {mobyPostgresLogger} = require("../plugin-pg-logger");
const {formattedConsoleLog} = require("junk-bucket/logging-bunyan");


const { unlink } = require('junk-bucket/fs');
const { spawn } = require('child_process');
const Future = require("junk-bucket/future");
async function createFifo( targetFile ){
	const exited = new Future();
	const createRun = spawn('mkfifo', [targetFile]);
	createRun.on('exit', function( status ){
		if( status != 0 ){
			exited.reject( status );
		} else {
			exited.accept( status );
		}
	});
	return exited.promised;
}

async function newFifo( context, targetFile ){
	await createFifo( targetFile );
	context.onCleanup( () => unlink( targetFile ) );
}

const rp = require("request-promise-native");

const pg = require("pg");
function newPGPool( context, config ){
	const pool = new pg.Pool( config );
	context.onCleanup( () => pool.end() );
	return pool;
}

function runSQLCount( table ){
	return async function(db) {
		const result = await db.query("SELECT count(*) FROM " + table);
		return parseInt(result.rows[0].count);
	}
}

const countMessages = runSQLCount("messages");
const countContainers = runSQLCount("containers");
const countDrivers = runSQLCount("driver_instances");

const fs = require("fs");
const {promiseEvent } = require("junk-bucket/future");
const {ProtobufWriter, DockerLogEntryExternalizer, protobufType} = require("../entry-parser");
const {LengthPrefixedFrameEgress} = require("../length-framed");
async function simulateContainerLogs( parentContext, socketFile, entryGenerator ){
	// Create the context
	const containerContext = parentContext.subcontext("docker-container");

	// Create a new FIFO to represent the docker context
	const base = await contextTemporaryDirectory(containerContext, "container-");
	const fifoFile = base + "/example-container";

	await newFifo(containerContext, fifoFile);

	//Issue logging request
	const baseURI = "http://unix:" + socketFile + ":";
	const result = await rp({
		uri: baseURI + "/LogDriver.StartLogging",
		json: {
			File: fifoFile,
			Info: {
				container: "example-container"
			}
		}
	});
	expect(result).to.deep.eq({});
	try {
		//TODO: Find out if there is some way to unblock NodeJS on the FIFO queue
		const stream = fs.createWriteStream(fifoFile);
		try {
			const LogEntry = await protobufType(__dirname + "/../entry.proto", "LogEntry");
			const externalizer = new DockerLogEntryExternalizer(containerContext.logger);
			const protobufSerializer = new ProtobufWriter(LogEntry);
			const framing = new LengthPrefixedFrameEgress();
			externalizer.pipe(protobufSerializer).pipe(framing).pipe(stream);
			await entryGenerator(externalizer);
			externalizer.end();

			await promiseEvent(stream, 'finish');
		}finally {
			stream.close();
		}
	} finally {
		const endLogging = await rp({
			uri: baseURI + "/LogDriver.StopLogging",
			json: {
				File: fifoFile
			}
		});
		expect(endLogging).to.deep.eq({});
	}
}

describe("Integration Test", function () {
	describe("Given the plugin has been launched", function () {
		beforeEach(async function () {
			const rootContext = new Context("docker-plugin-root", defaultNullLogger);
			this.rootContext = rootContext;

			const socketDir = await contextTemporaryDirectory(rootContext, "docker-plugin-test");
			//Configure plugin launch context
			const socketFile = socketDir + "/" + "plugin.sock";
			this.socketFile = socketFile;
			const pluginContext = rootContext.subcontext("pluginContext");
			pluginContext.socket = socketFile;
			pluginContext.pg_config = {
				connectionTimeoutMillis: 50
			};

			//Capture startup metrics
			this.testPool = newPGPool(pluginContext, pluginContext.pg_config);
			this.startingDrivers = await countDrivers(this.testPool);

			// Launch the context
			const control = await mobyPostgresLogger(pluginContext);
			this.control = control;
			pluginContext.onCleanup( () => control.close());
			this.pluginContext = pluginContext;


			//Capture logging information
			this.startingMessageCount = await countMessages(this.testPool);
			this.startingContainersCount = await countContainers(this.testPool);
		});
		afterEach(async function () {
			await this.rootContext.cleanup();
		});

		it("logs the driver", async function(){
			expect(await countDrivers(this.testPool)).to.eq(this.startingDrivers + 1);
		});
		it("registers the driver ID", async function f() {
			expect(this.control.id).to.be.a("number");
		});

		describe("When it logs a container", function () {
			beforeEach(async function () {
				await simulateContainerLogs(this.pluginContext, this.socketFile, (output) =>{
					output.write({line: Buffer.from("test", "utf-8")});
					output.write({line: Buffer.from("another test message", "utf-8")});
				});
			});

			it("Registers the messages", async function () {
				const endingMessageCount = await countMessages(this.testPool);
				expect(endingMessageCount).to.eq(this.startingMessageCount + 2);
			});

			it("has the correct container count", async function () {
				expect( await countContainers(this.testPool)).to.eq(this.startingContainersCount + 1 );
			})
		});
	});
});
