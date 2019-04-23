const {Writable} = require("stream");

class DriverStream extends Writable {
	constructor(pool, driverID ) {
		super({
			objectMode: true
		});
		this.pool = pool;
		this.driverID = driverID;
	}

	_write(chunk, encoding, callback){
		this._send( chunk ).then(() => callback(), (e) => callback(e));
	}

	async _send( message ){
		await this.pool.query("INSERT INTO drive_messages (driver_id, entry) VALUES ($1, $2)", [this.driverID,message]);
	}
}

async function resolveDriverID( pool, id ){
	if( id ){ return id; }
	const insertResponse = await pool.query("INSERT INTO driver_instances (created_at) VALUES (now()) RETURNING id", []);
	const driverID = insertResponse.rows[0].id;
	return driverID;
}

async function newDriverLogger( pool, id ) {
	const driverID = await resolveDriverID(pool,id);
	return new DriverStream( pool, driverID );
}

module.exports = {
	newDriverLogger
};
