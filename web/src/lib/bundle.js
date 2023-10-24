
let bundle;

export async function loadBundle() {
    if (!bundle) {
        bundle = import("../../../dist/bundle.json")
    }
    return bundle
}