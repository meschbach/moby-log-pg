const {expect} = require("chai");
const {DockerLogEntryInternalizer} = require("../entry-parser");
const {defaultNullLogger} = require("junk-bucket/logging");

const {Writable} = require("stream");
const protobuf = require("protobufjs");
const {promiseEvent, parallel, delay} = require("junk-bucket/future");

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
	beforeEach(async function () {
		this.protoBufdocument = await protobuf.load( __dirname + "/../entry.proto" );
		this.LogEntry = this.protoBufdocument.lookupType("LogEntry");
		this.PartialLogEntryMetadata = this.protoBufdocument.lookupType("PartialLogEntryMetadata");
		this.capture = new CapturingWritable({
			objectMode:true
		});

		this.internalizer = new DockerLogEntryInternalizer(defaultNullLogger);
		this.internalizer.pipe(this.capture);
	});

	describe("Given an empty Line", function () { //TODO: These two don't really make sense
		describe("When written to the internalizer", function(){
			beforeEach( function(){
				const entry = this.LogEntry.create();
				entry.Line = "";

				this.internalizer.write(entry);
			});

			it("Does not emit the line", async function () {
				expect(this.capture.writes.length).to.eq(0);
			});
		});
	});

	describe("Given a valid line", function () {
		describe("When written to the internalizer", function(){
			it("Does not emit the line", async function () {
				const entry = this.LogEntry.create();
				entry.line = "Your hair is everywhere";

				this.internalizer.write(entry);
				expect(this.capture.writes.length).to.eq(1);
			});
		});
	});

	describe("Given a valid internalizer", function () {
		describe("When the last entry is received", function () {
			beforeEach(function () {
				const entry = this.LogEntry.create();
				entry.line = "last entry";
				entry.partial_log_metadata = this.PartialLogEntryMetadata.create({last:true});
				this.entry = entry;
			});

			it("emits the 'last-entry' event", async function () {
				await parallel([
					promiseEvent(this.internalizer, "last-entry"),
					(async () => {
						await delay(10);
						this.internalizer.write(this.entry)
					})()
				]);
			});
		});
	});
});
