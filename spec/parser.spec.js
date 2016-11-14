const {
    any,
    next,
    end,
    find,
    optional,
    repeat,
    required,
    sequence,
    deffered
} = require('../src/parser');

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
            expect(pattern.exec(['bac'], [0, 0], {})).toBe(false);
            expect(pattern.exec(['dabc'], [0, 1], {})).toEqual({
                result: ['a', 'b'],
                end: [0, 3]
            });
            expect(pattern.exec(['dabc'], [0, 0], {})).toBe(false);
            expect(pattern.exec(['bacd'], [0, 0], {})).toBe(false);
        });

        it('should parse multiple strings', () => {
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

    describe('integration methods', () => {
        const
            name = find(/[a-z\-]+/i),
            attr = sequence(
                name,
                find('='),
                sequence(
                    find('"'),
                    find(/[^"]*/i),
                    find('"')
                ).then(value => value[1])
            ).then(value => ({ name: value[0], value: value[2] })),
            whiteSpace = find(/\s+/),
            attrs = repeat(attr, whiteSpace).then(value => {
                var result = {};
                value.forEach(a => (result[a.name] = a.value));
                return result;
            }),
            text = find(/[^<]+/i),
            node = sequence(
                find('<').not(find('</')),
                required(name),
                optional(sequence(whiteSpace, attrs).then(value => value[1])),
                optional(whiteSpace),
                required(
                    any(
                        find('/>').then(() => []),
                        sequence(
                            required(find('>')),
                            optional(repeat(any(
                                text,
                                deffered(() => node),
                                whiteSpace
                            ))),
                            sequence(
                                required(find('</')),
                                required(name)
                                    .useCache()
                                    .useCache()
                                    .useCache(false)
                                    .useCache(false)
                                    .useCache(),
                                optional(whiteSpace),
                                required(find('>'))
                            ).useCache()
                        ).then(value => value[1] || [])
                    )
                )
            ).then(value => ({
                tag: value[1],
                attrs: value[2],
                children: value[4]
            }));

        it('should parse one element', () => {
            const result = node.parse('<div class="block" id="id1">text of div</div>');
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
            const result = node.parse('<div class="block" id="id1"><p id="id2">text of p</p></div>');
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
            const result = node.parse('<input type="text" value="value" name="firstName" />');
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
            const result = node.parse('<input type="text" value="value" name="firstName"/>');
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
    });

    describe('integration methods multiple strings', () => {
        const
            name = find(/[a-z\-]+/i),
            placeholder = next().then((value, values) => values[value]),
            attr = sequence(
                name,
                find('='),
                sequence(
                    find('"'),
                    find(/[^"]*/i),
                    find('"')
                ).then(value => value[1])
            ).then(value => ({ name: value[0], value: value[2] })),
            attrWithPlaceholder = sequence(
                name,
                find('='),
                placeholder
            ).then(value => ({ name: value[0], value: value[2] })),
            whiteSpace = find(/\s+/),
            attrs = repeat(any(attr, attrWithPlaceholder), whiteSpace).then(value => {
                var result = {};
                value.forEach(a => (result[a.name] = a.value));
                return result;
            }),
            text = find(/[^<]+/i),
            node = sequence(
                find('<').not(find('</')),
                required(name),
                optional(sequence(whiteSpace, attrs).then(value => value[1])),
                optional(whiteSpace),
                required(
                    any(
                        find('/>').then(() => []),
                        sequence(
                            required(find('>')),
                            optional(repeat(any(
                                text,
                                deffered(() => node),
                                whiteSpace
                            ))),
                            required(find('</')),
                            required(name),
                            optional(whiteSpace),
                            required(find('>'))
                        ).then(value => value[1] || [])
                    )
                )
            ).then(value => ({
                tag: value[1],
                attrs: value[2],
                children: value[4]
            }));

        it('should parse element with child', () => {
            const values = [{ borderColor: 'red' }, 'title of div', 'some-classname'],
                result = node.parse(['<div class="block" style=',' id="id1" title=','><p id="id2" class=','>text of p</p></div>'], values, false);

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
                result1 = node.parse(['<div class="block" style=',' id="id1" title=','><p id="id2" class=','>text of p</p></div>'], values1),
                result2 = node.parse(['<div class="block" style=',' id="id1" title=','><p id="id2" class=','>text of p</p></div>'], values2);

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
