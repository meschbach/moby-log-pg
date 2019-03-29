const {mlpMain} = require("./cli-main");

mlpMain( async (context, logger) =>{
	const instancesResponse = await context.pool.query("SELECT * FROM containers ORDER BY created_at ASC");
	logger.debug("Response: ", instancesResponse.rows);
	const instances = instancesResponse.rows;
	process.stdout.write(JSON.stringify(instances));
});
