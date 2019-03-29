const {Transform} = require("stream");

class LengthPrefixedFrameIngress extends Transform {
	constructor(options, logger) {
		const defaultOptions = Object.assign({}, options, {readableObjectMode: true});
		super(defaultOptions);
		this.pending = Buffer.alloc(0);
		this.logger = logger;
	}

	_transform(chunk, encoding, cb) {
		this.pending = Buffer.concat([this.pending, chunk]);
		while( this.pending.length > 2 ) {
			const size = this.pending.readUInt16BE(0);

			const frame = this.pending.slice(2, size + 2);
			this.push(frame);
			this.pending = this.pending.slice( size + 2 );
		}
		cb();
	}
}

class LengthPrefixedFrameEgress extends Transform {
	_transform(chunk, encoding, cb) {
		const output = Buffer.alloc(2);
		output.writeUInt16BE(chunk.length);
		this.push(output);
		this.push(chunk);
		cb();
	}
}

module.exports = {
	LengthPrefixedFrameIngress,
	LengthPrefixedFrameEgress
};
