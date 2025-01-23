function checkArguments(...args) {
    return args.every(arg => arg !== null && arg !== undefined);
}

module.exports = {
    checkArguments
}
