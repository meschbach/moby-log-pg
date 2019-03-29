const protobuf = require("protobufjs");
const {Transform} = require("stream");

class ProtobufWriter extends Transform {
	constructor( messageType ){
		super({writableObjectMode: true});
		this.messageType = messageType;
	}

	_transform(chunk, encoding, callback) {
		try {
			const bytes = this.messageType.encode(chunk).finish();
			callback(null, bytes);
		}catch(e){
			callback(e);
		}
	}
}

class ProtobufParser extends Transform {
	constructor(messageParser, logger) {
		super({objectMode: true});
		this.messageParser = messageParser;
		this.logger = logger;
	}

	_transform(chunk, encoding, callback) {
		this.logger.debug("Decoding chunk");
		let err, value;
		try {
			const message = this.messageParser.decode(chunk);
			this.logger.debug("Decoded chunk", message);
			value = message;
		} catch (e) {
			this.logger.error("Failed to parse frame", e);
			err = e;
		}
		callback(err, value);
	}
}

class DockerLogEntryInternalizer extends Transform {
	constructor(logger) {
		super({objectMode: true});
		this.logger = logger;
	}

	_transform(msg, encoding, callback) {
		let err = null, value = null;
		try {
			const rawLine = msg.line;
			if( rawLine ) {
				const line = rawLine.toString("utf-8");
				if( line.length > 0 ) {
					const newMessage = Object.assign({}, msg, {line});
					value = newMessage;
				}
			}
		} catch (e) {
			this.logger.error("Failed to parse frame", e);
			err = e;
		} finally {
			callback( err, value );
		}
	}
}

class DockerLogEntryExternalizer extends Transform {
	constructor(logger) {
		super({objectMode: true});
		this.logger = logger;
	}

	_transform(msg, encoding, callback) {
		const outMessage = Object.assign({}, msg);
		outMessage.line = Buffer.from(outMessage.line,"utf-8");
		callback(null, outMessage);
	}
}

async function protobufParsingStream( protobufFile, logger ) {
	const parser = await protobufType( protobufFile, "LogEntry");
	return new ProtobufParser(parser, logger);
}

async function protobufType( protobufFile, typeName ){
	const document = await protobuf.load( protobufFile );
	const protobufType = document.lookupType(typeName);
	return protobufType;
}

module.exports = {
	protobufParsingStream,
	DockerLogEntryInternalizer,
	ProtobufWriter,
	DockerLogEntryExternalizer,
	protobufType
};
