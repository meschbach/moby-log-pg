const dockerPluginConfig = require("./config");
const {Context} = require("junk-bucket/context");
const {mobyPostgresLogger} = require("./plugin-pg-logger");

async function dockerPluginMain( stdLogger ){
	stdLogger.info("Starting Postgres sink");
	// Resolve the socket address
	const configSocketName = dockerPluginConfig.interface.socket;
	const prefix = "/run/docker/plugins/";
	const socketFileName = prefix + configSocketName;

	//
	const rootContext = new Context("moby-log-pg", stdLogger);
	rootContext.socket = socketFileName;
	await mobyPostgresLogger(rootContext);


	function stopInstance(){
		rootContext.cleanup();
	}

	process.on("SIGINT", stopInstance);
	process.on("SIGTERM", stopInstance);
}

const {main} = require("junk-bucket");
const {formattedConsoleLog} = require("junk-bucket/logging-bunyan");

main( dockerPluginMain, formattedConsoleLog("moby-log-pg"));
