const {Writable} = require("stream");
const assert = require("assert");

class PostgresMessageSink extends Writable {
	constructor( pool, metaID, logger ){
		assert(pool);
		super({
			objectMode: true
		});
		this.pool = pool;
		this.metaID = metaID;
		this.logger = logger;
	}

	_write(chunk, encoding, callback){
		this._send( chunk ).then(() => callback(), (e) => callback(e));
	}

	async _send( message ){
		this.logger.info("Log Entry: ", {message});
		await this.pool.query("INSERT INTO messages (container_id, entry) VALUES ($1, $2)", [this.metaID,message]);
	}
}

async function newContainerSink( pool, metaInfo, logger, driverID ){
	const insertResponse = await pool.query("INSERT INTO containers (meta, driver) VALUES($1, $2) RETURNING id", [metaInfo, driverID]);
	const metaID = insertResponse.rows[0].id;
	return new PostgresMessageSink(pool, metaID, logger);
}

module.exports = {
	newContainerSink
};
