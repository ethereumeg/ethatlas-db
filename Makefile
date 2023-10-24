.PHONY: all build

all: test build build-web consolidate

test:
	deno test --unstable --allow-read utils/exec.js

build:
	deno run --unstable --allow-read --allow-write utils/exec.js build

build-web:
	cd web && npm run build

consolidate:
	rm -rf ./output
	cp -R ./web/dist ./output
	mkdir ./output/data
	cp ./dist/bundle.json ./output/data/index.json

fmt:
	deno fmt utils/*.js