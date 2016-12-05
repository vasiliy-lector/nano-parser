const {
    any,
    conditional,
    next,
    end,
    find,
    optional,
    repeat,
    required,
    sequence,
    defer
} = require('../src/parser');

function getParser() {
    const
        whiteSpace = find(/^\s+/),
        optionalWhiteSpace = optional(whiteSpace),
        textNode = find(/^[^<]+/),
        tagName = find(/^[a-zA-Z][a-zA-Z0-9]*/),
        placeholder = next(),
        attrName = find(/^[a-zA-Z_][a-zA-Z0-9]*/),
        booleanAttr = attrName.then(result => [result, true]),
        quotedAttr = sequence(
            attrName,
            find('='),
            required(find('"')),
            find(/[^"]*/),
            required(find('"'))
        ).then(result => [result[0], result[3]]),
        attrWithPlaceholder = sequence(
            attrName,
            find('='),
            any(
                placeholder,
                sequence(
                    required(find('"')),
                    placeholder,
                    required(find('"'))
                ).then(result => result[1])
            )
        ).then(result => (obj, values) => {
            obj[result[0]] = values[result[2]];
        }),
        attrs = repeat(
            any(
                placeholder.then(index => (obj, values) => {
                    const value = values[index],
                        keys = Object.keys(value);
                    let i = keys.length;

                    while (i--) {
                        obj[keys[i]] = value[keys[i]];
                    }
                }),
                attrWithPlaceholder,
                quotedAttr,
                booleanAttr
            ),
            whiteSpace
        ).then(results => values => {
            const memo = {};

            for (let i = 0, l = results.length; i < l; i++) {
                const result = results[i];
                if (typeof result === 'function') {
                    result(memo, values);
                } else {
                    memo[result[0]] = result[1];
                }
            }

            return memo;
        }),
        component = sequence(
            find('<').not(find('</')),
            required(any(
                tagName,
                placeholder.then(index => values => values[index])
            )),
            optional(sequence(
                whiteSpace,
                attrs
            )).then(result => values => result ? result[1](values) : {}),
            optionalWhiteSpace,
            required(any(
                find('/>').then(() => []),
                sequence(
                    required(find('>')),
                    optional(repeat(any(
                        whiteSpace,
                        placeholder.then(index => values => values[index]),
                        textNode,
                        defer(() => component)
                    ))),
                    required(sequence(
                        find('</'),
                        any(
                            tagName,
                            placeholder
                        ),
                        optionalWhiteSpace,
                        find('>')
                    ))
                ).then(result => values => {
                    const memo = [],
                        items = result[1] || [];

                    for (let i = 0, l = items.length; i < l; i++) {
                        const item = items[i];
                        memo[i] = typeof item === 'function' ? item(values) : item;
                    }

                    return memo;
                })
            ))
        ).then(result => values => ({
            tag: typeof result[1] === 'function' ? result[1](values) : result[1],
            attrs: result[2](values),
            children: typeof result[4] === 'function' ? result[4](values) : result[4]
        })),

        root = sequence(
            optionalWhiteSpace,
            component,
            optionalWhiteSpace,
            end()
        ).useCache().then((result, values) => result[1](values));

    return root;
}

describe('Parser', () => {
    describe('method find', () => {
        describe('one string', () => {
            it('should work with strings', () => {
                const pattern = find('a');
                expect(pattern.exec(['abc'], [0, 0], {})).toEqual({
                    result: 'a',
                    end: [0, 1]
                });
                expect(pattern.exec(['abc'], [0, 1], {})).toBe(false);
                expect(pattern.exec(['bac'], [0, 1], {})).toEqual({
                    result: 'a',
                    end: [0, 2]
                });
                expect(pattern.exec(['bac'], [0, 0], {})).toBe(false);
            });

            it('should work with regexps', () => {
                const pattern = find(/a/);

                expect(pattern.exec(['abc'], [0, 0], {})).toEqual({
                    result: 'a',
                    end: [0, 1]
                });
                expect(pattern.exec(['abc'], [0, 1], {})).toBe(false);
                expect(pattern.exec(['bac'], [0, 1], {})).toEqual({
                    result: 'a',
                    end: [0, 2]
                });
                expect(pattern.exec(['bac'], [0, 0], {})).toBe(false);
            });

            it('should work not', () => {
                const pattern = find(/[a-z]/).not(find('a'));

                expect(pattern.exec(['abc'], [0, 0], {})).toBe(false);
                expect(pattern.not(find('a')).exec(['abc'], [0, 1], {})).toEqual({
                    result: 'b',
                    end: [0, 2]
                });
            });

            it('should correctly work useCache', () => {
                const pattern = find('a'),
                    pattern2 = pattern.useCache(),
                    pattern3 = pattern2.useCache(),
                    pattern4 = pattern3.useCache(false),
                    pattern5 = pattern4.useCache(false),
                    pattern6 = pattern5.useCache();

                expect(pattern).not.toBe(pattern2);
                expect(pattern3).toBe(pattern2);
                expect(pattern4).not.toBe(pattern2);
                expect(pattern5).toBe(pattern4);
                expect(pattern6).not.toBe(pattern5);
            });

            it('should work option cacheEnabled', () => {
                const pattern = find('a').then((result, values) => result + values[0]).useCache();

                expect(pattern.parse('a', ['b'])).toEqual('ab');
                expect(pattern.parse('a', ['c'])).toEqual('ab');
                expect(pattern.parse('a', ['c'], false)).toEqual('ac');
            });
        });

        describe('multiple strings', () => {
            it('should work with strings', () => {
                const pattern = find('a');
                expect(pattern.exec(['abc', 'bac'], [1, 1], {})).toEqual({
                    result: 'a',
                    end: [1, 2]
                });
                expect(pattern.exec(['abc', 'bac'], [1, 0], {})).toBe(false);
            });

            it('should work with regexps', () => {
                const pattern = find(/a/);

                expect(pattern.exec(['abc', 'bac'], [1, 1], {})).toEqual({
                    result: 'a',
                    end: [1, 2]
                });
                expect(pattern.exec(['abc', 'bac'], [1, 0], {})).toBe(false);
            });
        });

    });

    describe('method conditional', () => {
        it('should choose expected pattern', () => {
            const condition = find(/[a-z]+\d+/),
                pattern1 = find(/[a-z]+/).then(result => 'id' + result),
                pattern2 = find(/[a-z]+/),
                pattern = conditional(
                    condition,
                    pattern1,
                    pattern2
                );

            expect(pattern.parse('abc')).toBe('abc');
            expect(pattern.parse('abc1')).toBe('idabc');
        });
    });

    describe('method any', () => {
        it('should find pattern', () => {
            const pattern = any(
                find('a'),
                find('b')
            );
            expect(pattern.exec(['abc'], [0, 0], {})).toEqual({
                result: 'a',
                end: [0, 1]
            });
            expect(pattern.exec(['bac'], [0, 0], {})).toEqual({
                result: 'b',
                end: [0, 1]
            });
            expect(pattern.exec(['bac', 'abc'], [1, 1], {})).toEqual({
                result: 'b',
                end: [1, 2]
            });
            expect(pattern.exec(['abc'], [0, 2], {})).toBe(false);
            expect(pattern.exec(['cde'], [0, 0], {})).toBe(false);
        });
    });

    describe('method required', () => {
        it('should thrown error if not found', () => {
            const pattern = sequence(
                find('a'),
                required(find('b'))
            );
            expect(pattern.exec(['bc'], [0, 0], {})).toBe(false);
            expect(pattern.exec(['abc'], [0, 0], {})).toEqual({
                result: ['a', 'b'],
                end: [0, 2]
            });
            expect(() => pattern.exec(['ac'], [0, 0], {})).toThrow();
            expect(() => pattern.exec(['cdefghijklmnopqrstuvwxyzac'], [0, 24], {})).toThrow();
        });
    });

    describe('method sequence', () => {
        it('should find pattern', () => {
            const pattern = sequence(
                find('a'),
                find('b')
            );
            expect(pattern.exec(['abc'], [0, 0], {})).toEqual({
                result: ['a', 'b'],
                end: [0, 2]
            });
            expect(pattern.parse('abc')).toEqual(['a', 'b']);

            expect(pattern.exec(['bac'], [0, 0], {})).toBe(false);
            expect(pattern.exec(['dabc'], [0, 1], {})).toEqual({
                result: ['a', 'b'],
                end: [0, 3]
            });
            expect(pattern.exec(['dabc'], [0, 0], {})).toBe(false);
            expect(pattern.exec(['bacd'], [0, 0], {})).toBe(false);
        });

        it('should parse multiple strings with values', () => {
            const pattern = sequence(
                find(/^[a-zA-Z]+/),
                next().then(number => `values[${number}]`),
                find('abc')
            ).then(values => values.join(','));

            expect(pattern.parse(['xyz', 'abc'])).toBe('xyz,values[0],abc');
            expect(pattern.parse(['xyz', 'abc', 'bvc'])).toBe('xyz,values[0],abc');
            expect(typeof pattern.parse(['xy1', 'abc'])).toBe('undefined');
            expect(typeof pattern.parse(['xyz', 'acb'])).toBe('undefined');
        });

        it('should parse multiple strings using end', () => {
            const pattern = sequence(
                sequence(
                    find(/^[a-zA-Z]+/),
                    next().then(number => `values[${number}]`),
                    find('abc')
                ).then(values => values.join(',')),
                end()
            ).then(values => values[0]);

            expect(pattern.parse(['xyz', 'abc'])).toBe('xyz,values[0],abc');
            expect(typeof pattern.parse(['xyz', 'abc', 'bvc'])).toBe('undefined');
        });

        it('should work then', () => {
            const pattern = sequence(
                find('a'),
                find('b')
            ).then(value => value[0] + value[1]);
            expect(pattern.exec(['abc'], [0, 0], {})).toEqual({
                result: 'ab',
                end: [0, 2]
            });
        });
    });

    describe('method repeat', () => {
        it('should find pattern', () => {
            const pattern = repeat(
                find(/[a-z]+/),
                find(/\s/)
            );
            expect(pattern.exec(['a bc def ghjk'], [0, 0], {})).toEqual({
                result: ['a', 'bc', 'def', 'ghjk'],
                end: [0, 13]
            });
            expect(pattern.exec(['a bc '], [0, 0], {})).toEqual({
                result: ['a', 'bc'],
                end: [0, 4]
            });
        });

        it('should work without delimeter', () => {
            const pattern = repeat(
                find(/\d/)
            );
            expect(pattern.exec(['123'], [0, 0], {})).toEqual({
                result: ['1', '2', '3'],
                end: [0, 3]
            });
        });

        it('should parse multiple strings', () => {
            const pattern = repeat(
                any(
                    find(/[a-z]+/),
                    next().then(number => `values[${number}]`)
                ),
                find(/\s/)
            );

            expect(pattern.parse(['a bc ', ' d ef'])).toEqual(['a', 'bc', 'values[0]', 'd', 'ef']);
        });
    });


    describe('method next', () => {
        it('should work', () => {
            const pattern = next();

            expect(pattern.exec(['ab', 'c'], [0, 2], {})).toEqual({
                result: 0,
                end: [1, 0]
            });
            expect(pattern.exec(['ab', 'c'], [0, 1], {})).toBe(false);
            expect(pattern.exec(['ab', 'c'], [1, 1], {})).toBe(false);
        });
    });

    describe('method end', () => {
        it('should work', () => {
            const pattern = end();

            expect(pattern.exec(['ab', 'c'], [0, 2], {})).toBe(false);
            expect(pattern.exec(['ab', 'c'], [0, 1], {})).toBe(false);
            expect(pattern.exec(['ab', 'c'], [1, 1], {})).toEqual({
                result: 1,
                end: [1, 1]
            });
        });
    });

    describe('integration methods', () => {
        let parser;

        beforeEach(() => {
            parser = getParser();
        });

        describe('one string', () => {
            it('should parse one element', () => {
                const result = parser.parse('<div class="block" id="id1">text of div</div>');

                expect(result).toEqual({
                    tag: 'div',
                    attrs: {
                        class: 'block',
                        id: 'id1'
                    },
                    children: ['text of div']
                });
            });

            it('should parse element with child', () => {
                const result = parser.parse('<div class="block" id="id1"><p id="id2">text of p</p></div>');
                expect(result).toEqual({
                    tag: 'div',
                    attrs: {
                        class: 'block',
                        id: 'id1'
                    },
                    children: [{
                        tag: 'p',
                        attrs: {
                            id: 'id2'
                        },
                        children: ['text of p']
                    }]
                });
            });

            it('should parse self closed element', () => {
                const result = parser.parse('<input type="text" value="value" name="firstName" />');

                expect(result).toEqual({
                    tag: 'input',
                    attrs: {
                        type: 'text',
                        value: 'value',
                        name: 'firstName'
                    },
                    children: []
                });
            });

            it('should parse self closed element without white space before slash', () => {
                const result = parser.parse('<input type="text" value="value" name="firstName"/>');

                expect(result).toEqual({
                    tag: 'input',
                    attrs: {
                        type: 'text',
                        value: 'value',
                        name: 'firstName'
                    },
                    children: []
                });
            });

            it('should correctly work with inner cache', () => {
                const patternA = find('a').useCache(),
                    patternB = find('bc'),
                    pattern = sequence(
                        patternA,
                        patternB
                    ).useCache();

                spyOn(patternA, 'exec').and.callThrough();
                spyOn(pattern, 'exec').and.callThrough();

                expect(pattern.parse('abc')).toEqual(['a', 'bc']);
                expect(patternA.exec).toHaveBeenCalledTimes(1);
                expect(pattern.exec).toHaveBeenCalledTimes(1);

                expect(pattern.parse('abc')).toEqual(['a', 'bc']);
                expect(patternA.exec).toHaveBeenCalledTimes(1);
                expect(pattern.exec).toHaveBeenCalledTimes(2);
            });
        });

        describe('multiple strings', () => {
            it('should parse element with child', () => {
                const values = [{ borderColor: 'red' }, 'title of div', 'some-classname'],
                    result = parser.parse(['<div class="block" style=',' id="id1" title=','><p id="id2" class=','>text of p</p></div>'], values, false);

                expect(result).toEqual({
                    tag: 'div',
                    attrs: {
                        class: 'block',
                        style: values[0],
                        id: 'id1',
                        title: values[1]
                    },
                    children: [{
                        tag: 'p',
                        attrs: {
                            id: 'id2',
                            class: values[2]
                        },
                        children: ['text of p']
                    }]
                });
            });

            it('should work with cache', () => {
                const
                    values1 = [{ borderColor: 'red' }, 'title of div', 'some-classname'],
                    values2 = [{ borderColor: 'blue' }, 'title2 of div', 'some-classname2'],
                    result1 = parser.parse(['<div class="block" style=',' id="id1" title=','><p id="id2" class=','>text of p</p></div>'], values1),
                    result2 = parser.parse(['<div class="block" style=',' id="id1" title=','><p id="id2" class=','>text of p</p></div>'], values2);

                expect(result1).toEqual({
                    tag: 'div',
                    attrs: {
                        class: 'block',
                        style: values1[0],
                        id: 'id1',
                        title: values1[1]
                    },
                    children: [{
                        tag: 'p',
                        attrs: {
                            id: 'id2',
                            class: values1[2]
                        },
                        children: ['text of p']
                    }]
                });

                expect(result2).toEqual({
                    tag: 'div',
                    attrs: {
                        class: 'block',
                        style: values2[0],
                        id: 'id1',
                        title: values2[1]
                    },
                    children: [{
                        tag: 'p',
                        attrs: {
                            id: 'id2',
                            class: values2[2]
                        },
                        children: ['text of p']
                    }]
                });
            });
        });
    });
});
