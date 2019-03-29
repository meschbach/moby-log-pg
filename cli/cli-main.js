const {Context} = require("junk-bucket/Context");
const {main} = require("junk-bucket");
const {formattedConsoleLog} = require("junk-bucket/logging-bunyan");
const pg = require("pg");

function newDatabasePool(context) {
	const pool = pg.Pool();
	context.pool = pool;
	context.onCleanup(async () =>{
		await pool.end();
	});
	return pool;
}

function mlpMain( f ){
	main( async (logger) => {
		const context = new Context("moby-log-pg", logger);
		try {
			const pool = newDatabasePool(context);

			await f(context, logger);
		}finally {
			context.cleanup();
		}
	}, formattedConsoleLog("moby-log-pg"));
}

module.exports = {
	mlpMain
};