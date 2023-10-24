.PHONY: all build

all: test build-data

test:
	deno test --unstable --allow-read utils/exec.js

build-all: test build-data build-web consolidate

build-data:
	deno run --unstable --allow-read --allow-write utils/exec.js build

build-web:
	cd web && npm run build

consolidate:
	rm -rf ./output
	cp -R ./web/dist ./output
	mkdir ./output/data
	cp ./dist/bundle.json ./output/data/index.json

extend:
	deno run --unstable --allow-read --allow-write --allow-net utils/extend.js

fmt:
	deno fmt utils/*.js utils/extenders/*.js