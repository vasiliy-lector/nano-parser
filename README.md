# nano-parser
Parser combinators library for parsing strings and arrays of strings (developed for parsing ecmascript tagged template strings). [Read in russian](https://github.com/vasiliy-lector/nano-parser/blob/master/README_RU.md)

## Installing
```bash
npm install --save 'nano-parser';
```

## Usage
```javascript
    const {
        any,
        defer,
        end,
        find,
        next,
        optional,
        repeat,
        required,
        sequence
    } = require('nano-parser');

    const parser = find(/[a-z]+/);
    parser.parse('abcd'); // abcd
    parser.parse('ab1cd'); // ab
    parser.parse('1abcd'); // undefined
```

## Examples of using:
* [es6x - implementation of jsx features in pure javascript](https://github.com/vasiliy-lector/es6x)

## Overview
With the help of nano-parser, you can create complex parsers, combining simple. It's possible to transform results using the method **then**, as well as to use the cache to improve performance.

### Elementary parsers
**find**, **next** and **end** are most simple parsers. **find** parser designed to search for  strings or regular expressions. **next** and **end** used when parsing an array of strings (useful for es6 template strings).

### Combinators
**any**, **conditional**, **sequence** and **repeat** designed to combine other parsers with each other.

### Subsidiary parsers
**optional**, **required** and **defer** are subsidiary. **optional** makes parser optional, **required** makes parser strictly necessary and **defer** provides the possibility to call the parser from itself.

### Class Parser
All parsers return a instance of class **Parser**. Therefore, they have the same interface. The **exec** method is internal and is used to call from other parsers. Instead, use the **parse** method. The **parse** method takes the first argument string or array of strings, optional second parameter values are values that will be available as the second parameter of the method **then**. To cache the results use **useCache** method.

## Documentation

### find
**find** is used to search for a regular expression or a direct match with a string.
Examples:
```javascript
    const parser = find('a');
    expect(parser.parse('abc')).toBe('a');
    expect(parser.parse('bac')).toBe(undefined);
```
```javascript
    const parser = find(/^[a-z]/);
    expect(parser.parse('abc')).toBe('abc');
    expect(parser.parse('bac')).toBe('bac');
    expect(parser.parse('1abc')).toBe(undefined);
```
```javascript
    const parser = find(/^[a-z]/).not(find('x'));
    expect(parser.parse('abc')).toBe('abc');
    expect(parser.parse('bacx')).toBe(undefined);
```
The symbol "^" is recommended to optimize the regular expression.

### any
**any** makes it possible to find one of the matches.
```javascript
    const parser = any(
        find('a'),
        find('c')
    );
    expect(parser.parse('a')).toBe('a');
    expect(parser.parse('c')).toBe('c');
    expect(parser.parse('b')).toBe(undefined);
```
```javascript
    const parser = any(
        find(/^[a-c]/),
        find(/^[e-g]/)
    ).not(find('abc'));
    expect(parser.parse('ab')).toBe('ab');
    expect(parser.parse('fg')).toBe('fg');
    expect(parser.parse('abc')).toBe(undefined);
```

### sequence
With **sequence** you can build sequences of parsers.
```javascript
    const parser = sequence(
        find('ab'),
        find(/^[c-e]+/),
        find(/^[0-9]/)
    );
    expect(parser.parse('abcc1')).toBe(['ab', 'cc', '1']);
    expect(parser.parse('abcc')).toBe(undefined);
```
```javascript
    const parser = sequence(
        find('ab'),
        find(/^[c-e]+/),
        find(/^[0-9]/)
    ).then(results => results.join(''));
    expect(parser.parse('abcc1')).toBe('abcc1');
    expect(parser.parse('abcc')).toBe(undefined);
```
In the previous example you can see in action a useful method **then**, which is in any parser. And also, any parser has methods **not** and **useCache**. **then** and **not** return a new parser, so you can easily form a new entity, without affecting the existing:
```javascript
    const parser1 = find(/^[a-c]/),
        parser2 = parser1.not(find('b')),
        parser3 = parser1.then(result => result + '1'),
        parserCached = parser1.useCache();
    expect(parser1).not.toBe(parser2);
    expect(parser1).not.toBe(parser3);
    expect(parser1).toBe(parserCached);
```

### repeat
**repeat** is used to find the repeated sequences.
```javascript
    const
        name = find(/^[a-z0-9]/i),
        assignment = sequence(name, find('='), name).then(results => [results[0], results[2]]),
        whiteSpace = find(/^\s+/),
        parser = repeat(assignment, whiteSpace);

    expect(parser.parse('a=a b=b c=d')).toEqual([['a', 'a'], ['b', 'b'], ['c', 'd']]);
    expect(parser.parse('a=a b=b x c=d')).toEqual([['a', 'a'], ['b', 'b']]);
    expect(parser.parse('x a=a b=b c=d')).toBe(undefined);
```

### conditional
**conditional** is useful when you want to look forward.
```javascript
    const condition = find(/[a-z]+\d+/),
        pattern1 = find(/[a-z]+/),
        pattern2 = pattern1.then(() => 'x'),
        parser = conditional(
            condition,
            pattern1,
            pattern2
        );

    expect(parser.parse('abc')).toBe('x');
    expect(parser.parse('abc1')).toBe('abc');
```

### optional
**optional** makes parsers optional.
```javascript
    const whiteSpace = find(/^\s+/),
        optionalWhiteSpace = optional(whiteSpace),
        parser1 = sequence(find('a'), whiteSpace, find('b')),
        parser2 = sequence(find('a'), optionalWhiteSpace, find('b'));

    expect(parser1.parse('a b')).toEqual(['a', ' ', 'b']);
    expect(parser1.parse('ab')).toBe(undefined);
    expect(parser2.parse('a b')).toEqual(['a', ' ', 'b']);
    expect(parser2.parse('ab')).toEqual(['a', undefined, 'b']);
```

### required
**required** will generate an error that the expected characters are not found:
```javascript
    const whiteSpace = find(/^\s+/),
        requeiredWhiteSpace = required(whiteSpace),
        parser1 = sequence(find('a'), whiteSpace, find('b')),
        parser2 = sequence(find('a'), requiredWhiteSpace, find('b'));

    expect(parser1.parse('a b')).toEqual(['a', ' ', 'b']);
    expect(parser1.parse('ab')).toBe(undefined);
    expect(parser2.parse('a b')).toEqual(['a', ' ', 'b']);
    expect(parser2.parse('ab')).toThrow(); // error of parsing with position
```

### next and end
**next** and **end** needed when parsing arrays of strings. **next** correspond to the spacing between strings, **end** - end of the array. These methods are useful when parsing es6 tagged template strings.
```javascript
    let lang;
    const i18Table = {
            'привет': 'hello'
        },
        anything = find(/^.*/),
        parser = repeat(any(
            anything,
            next().then((index, values) => lang === 'en' ? i18Table[values[index]] : values[index])
        )).then(results => results.join('')),
        i18n = function(strings, ...values) {
            return parser.parse(strings, values);
        };

    lang = 'en';
    expect(i18n `<div class="container">${'привет'}</div>`).toBe('<div class="container">hello</div>');
    lang = 'ru';
    expect(i18n `<div class="container">${'привет'}</div>`).toBe('<div class="container">привет</div>');
```

### defer
**defer** useful for creating recursive parsers.
```javascript
    const xml = sequence(
        find('<'),
        find(/^[a-z]+/),
        find('>'),
        repeat(any(
            find(/^[^<]/),
            defer(() => xml) // we can't use xml directly here, because it is undefined now
        ))
        find('<'),
        find(/^[a-z]+/),
        find('>'),
    ).then(results => ({
        tag: results[1],
        children: results[3]
    }));

    expect(xml.parse('<div><p>text</p></div>')).toEqual({
        tag: 'div',
        children: [{
            tag: 'p',
            children: ['text']
        }]
    });
```
