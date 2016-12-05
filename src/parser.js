'use strict';

function getHash(strings) {
    var i = strings.length,
        result = '' + i;

    while (i--) {
        result += strings[i];
    }

    return result;
}

function Parser(exec) {
    this.exec = exec;
}

Parser.prototype = {
    execCached: function(strings, position, options) {
        var hash = options.hash || (options.hash = getHash(strings)),
            cached = this.cache[hash];

        return cached === undefined
            ? (this.cache[hash] = this.originalExec(strings, position, options))
            : cached;
    },

    useCache: function(useCache) {
        useCache = useCache === undefined ? true : useCache;

        if (useCache && !this.originalExec) {
            this.originalExec = this.exec;
            this.exec = this.execCached.bind(this);
            this.cache = this.cache || {};
        } else if (!useCache && this.originalExec) {
            this.exec = this.originalExec;
            delete this.originalExec;
        }

        return this;
    },

    not: function(pattern) {
        var exec = this.exec;

        return new Parser(function (strings, position, options) {
            return !pattern.exec(strings, position, options) ? exec(strings, position, options) : false;
        });
    },

    then: function(transform) {
        var exec = this.exec;

        return new Parser(function (strings, position, options) {
            var executed = exec(strings, position, options);

            return executed && {
                result: transform(executed.result, options.values),
                end: executed.end
            };
        });
    },

    parse: function(string, values) {
        var strings = typeof string === 'string' ? [string] : string,
            position = [0, 0];

        return (this.exec(strings, position, { values: values }) || {}).result;
    }
};

function find(pattern) {
    if (typeof pattern === 'string') {
        var length = pattern.length;

        return new Parser(function (strings, position) {
            if (strings[position[0]].substr(position[1], length) === pattern) {
                return {
                    result: pattern,
                    end: [position[0], position[1] + length]
                };
            }

            return false;
        });
    } else {
        return new Parser(function (strings, position) {
            var match = pattern.exec(strings[position[0]].slice(position[1]));
            if (match && match.index === 0) {
                return {
                    result: match[0],
                    end: [position[0], position[1] + match[0].length]
                };
            }

            return false;
        });
    }
}

function optional(pattern) {
    return new Parser(function (strings, position, options) {
        return pattern.exec(strings, position, options) || {
            result: undefined,
            end: position
        };
    });
}

function required(pattern) {
    return new Parser(function (strings, position, options) {
        return pattern.exec(strings, position, options) || error(strings[position[0]], position[1]);
    });
}

function conditional(pattern, success, fail) {
    return new Parser(function (strings, position, options) {
        return pattern.exec(strings, position, options) ? success.exec(strings, position, options) : fail.exec(strings, position, options);
    });
}

function any() {
    for (var i = 0, l = arguments.length, patterns = Array(l); i < l; i++) {
        patterns[i] = arguments[i];
    }

    var length = patterns.length;

    return new Parser(function (strings, position, options) {
        var executed = false;

        for (var i = 0, l = length; i < l && !executed; i++) {
            executed = patterns[i].exec(strings, position, options);
        }

        return executed;
    });
}

function sequence() {
    for (var i = 0, l = arguments.length, patterns = Array(l); i < l; i++) {
        patterns[i] = arguments[i];
    }

    var length = patterns.length;

    return new Parser(function (strings, position, options) {
        var executed,
            end = position,
            result = [];

        for (var i = 0, l = length; i < l; i++) {
            executed = patterns[i].exec(strings, end, options);
            if (!executed) {
                return false;
            }
            result.push(executed.result);
            end = executed.end;
        }

        return {
            result: result,
            end: end
        };
    });
}

function repeat(mainPattern, delimeter) {
    var pattern = !delimeter
        ? mainPattern
        : sequence(delimeter, mainPattern).then(function (value) { return value[1]; });

    return new Parser(function (strings, position, options) {
        var result = [],
            end = position,
            executed = mainPattern.exec(strings, end, options);

        while (executed !== false && (executed.end[1] > end[1] || executed.end[0] > end[0])) {
            result.push(executed.result);
            end = executed.end;
            executed = pattern.exec(strings, end, options);
        }

        return result.length > 0 && {
            result: result,
            end: end
        };
    });
}

function defer(getPattern) {
    var pattern;

    return new Parser(function (strings, position, options) {
        return (pattern || (pattern = getPattern())).exec(strings, position, options);
    });
}

function error(string, position) {
    var beginPos = position - 20 < 0 ? 0 : position - 20;

    throw new Error('Unexpected symbol\n\'' + string.slice(beginPos, position) + '***' + string[position] +
    '***' + string.slice(position + 1, position + 5) + '\'\nin position ' + position);
}

function next() {
    return new Parser(function (strings, position) {
        if (!strings[position[0]][position[1]]) {
            var nextPosition0 = position[0] + 1;

            return strings[nextPosition0] !== undefined ? {
                result: position[0],
                end: [nextPosition0, 0]
            } : false;
        }

        return false;
    });
}

function end() {
    return new Parser(function (strings, position) {
        return !strings[position[0]][position[1]] && strings[position[0] + 1] === undefined ? {
            result: position[0],
            end: position
        } : false;
    });
}

exports.Parser = Parser;
exports.any = any;
exports.conditional = conditional;
exports.next = next;
exports.end = end;
exports.find = find;
exports.optional = optional;
exports.repeat = repeat;
exports.required = required;
exports.sequence = sequence;
exports.defer = defer;
