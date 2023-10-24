.PHONY: all build

all: build

test:
	deno test --unstable --allow-read utils/exec.js

build:
	deno run --unstable --allow-read --allow-write utils/exec.js build

fmt:
	deno fmt utils/*.js