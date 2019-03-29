const {mlpMain} = require("./cli-main");

const argv = require("yargs").argv;

mlpMain( async (context, logger) =>{
	const queryParams = [];
	const where = [];
	if( argv.driver ) {
		queryParams.push(argv.driver);
		const id = queryParams.length;
		where.push("driver_id = $"+id);
	}

	const baseQuery = "SELECT * FROM drive_messages";
	const selection = where.length == 0 ? "" : (" WHERE " + where.join(" AND "));
	const query = baseQuery + selection + " ORDER BY created_at";
	logger.debug("Query ", {query});

	const instancesResponse = await context.pool.query(query, queryParams);
	logger.debug("Response: ", instancesResponse.rows);
	const instances = instancesResponse.rows;
	process.stdout.write(JSON.stringify(instances));
});
