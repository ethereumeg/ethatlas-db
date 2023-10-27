.PHONY: all build

all: test build-data

test:
	deno test --unstable --allow-read utils/exec.js --allow-env

build-all: test build-data build-web consolidate

build-data:
	deno run --unstable --allow-read --allow-write --allow-env utils/exec.js build

build-web:
	cd web && npm run build

consolidate:
	rm -rf ./output
	cp -R ./web/dist ./output
	mkdir ./output/data
	cp ./dist/bundle.json ./output/data/index.json
	cp -R ./static ./output/data

extend:
	deno run --unstable --allow-read --allow-write --allow-env --allow-net --allow-run utils/extend.js

fmt:
	deno fmt utils/*.js utils/extenders/*.js