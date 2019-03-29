
CREATE SEQUENCE container_ids;

CREATE TABLE containers (
    id integer NOT NULL DEFAULT nextval('container_ids') primary key,
    meta jsonb not null,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    driver integer not null references driver_instances(id)
);

CREATE SEQUENCE message_id;

CREATE TABLE messages (
    id integer NOT NULL DEFAULT nextval('message_id') primary key,
    container_id integer NOT NULL,
    entry jsonb not null,
    created_at timestamp without time zone NOT NULL DEFAULT now()
);

CREATE sequence driver_instance;
CREATE TABLE driver_instances (
    id integer NOT NULL DEFAULT nextval('driver_instance') primary key,
    created_at timestamp without time zone NOT NULL DEFAULT now()
);

CREATE sequence driver_message;
CREATE TABLE driver_messages (
    id integer NOT NULL DEFAULT nextval('driver_message') primary key,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    entry jsonb not null,
    driver_id integer references driver_instances(id) not null
);
