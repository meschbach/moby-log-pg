# moby-log-pg

A Docker Logging Plugin to store standard out and standard error to a Postgres database.

## Usage

### Launching a container:
```bash
docker run -d --log-driver=meschbach/moby-log-pg:1.0.0 alpine echo "Test" 
```

### Viewing Log Entries via utilities

Logs will be written to the database as they are generated.  In addition to accessing them directly you may also use
some of the utilities.  These will require the environmental variables to access the database.

* `node cli/containers-list` -- Lists the containers
* `node cli/containers-msgs` -- Lists messages, optionally constrained by the conatiner
* `node cli/driver-list` -- Lists the driver

### Viewing Log Entires via Postgres

An example query to generate the lines:
`SELECT entry->'line' as line, created_at FROM messages`

## Configuration

Usage should be relatively easy:
```bash
docker plugin install meschbach/moby-log-pg:1.0.0
docker plugin set meschbach/moby-log-pg:1.0.0 PGHOST=pg.example.com PGUSER=super-secret-user PGPASSWORD=super-secret-password
```

Most Postgres environmental properties may be set using this.  All properties can be set on install also.

### Requirements
* Postgres 11 is currently required.  Open to supporting older version through PRs :-).
* Docker 1.12+.  You probably have it. 

## Development

One should prefer to use unit and integration tests as much as possible.  Not only are the steps to run the plugin build
pipeline slow, it is also relatively easy to get Docker wedged into an unexpected state.  For example, sometimes you can
not delete containers if the plugin does not respond correctly to starting applications.

The simplest way to deploy a test version is to run `./deploy-image.sh`.  This will create a new plugin named
`test-plugin`.  Follow the normal utilization procedure and tail your docker logs.  This is normally
`/var/log/docker.log` however may also be directed to your `journald` instance (`journald -u docker -f`).

### Accessing Docker Daemon on OSX

Depending on your exact install the Docker daemon can run in one of several ways.  Docker for Mac can, at least at the
time of writing, be accessed via `~/Library/Containers/com.docker.docker/Data/vms/0/tty`.  For example:

`screen ~/Library/Containers/com.docker.docker/Data/vms/0/tty`

### Refs
[https://github.com/cpuguy83/docker-log-driver-test](https://github.com/cpuguy83/docker-log-driver-test) - Example Driver in Go
