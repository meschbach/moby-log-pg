const {expect} = require("chai");
const {DockerLogEntryInternalizer} = require("../entry-parser");
const {defaultNullLogger} = require("junk-bucket/logging");

const {Writable} = require("stream");
const protobuf = require("protobufjs");

class CapturingWritable extends Writable {
	constructor(props = {}) {
		super(props);
		this.writes = [];
	}

	_write(chunk, encoding, callback){
		const writeOp = {
			chunk,
			encoding
		};
		this.writes.push(writeOp);
	}
}

describe('DockerLogEntryInternalizer', function () {
	describe("Given an empty Line", function () {
		describe("When written to the internalizer", function(){
			it("Does not emit the line", async function () {
				const document = await protobuf.load( __dirname + "/../entry.proto" );
				const LogEntry = document.lookupType("LogEntry");
				const entry = LogEntry.create();
				entry.Line = "";

				const capture = new CapturingWritable();
				const internalizer = new DockerLogEntryInternalizer(defaultNullLogger);
				internalizer.pipe(capture);
				internalizer.write(entry);
				expect(capture.writes.length).to.eq(0);
			});
		});
	});

	describe("Given a valid line", function () {
		describe("When written to the internalizer", function(){
			it("Does not emit the line", async function () {
				const document = await protobuf.load( __dirname + "/../entry.proto" );
				const LogEntry = document.lookupType("LogEntry");
				const entry = LogEntry.create();
				entry.line = "Your hair is everywhere";

				const capture = new CapturingWritable({
					objectMode:true
				});
				const internalizer = new DockerLogEntryInternalizer(defaultNullLogger);
				internalizer.pipe(capture);
				internalizer.write(entry);
				expect(capture.writes.length).to.eq(1);
			});
		});
	});
});
