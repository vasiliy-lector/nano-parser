# nano-parser
Tool for parsing ecmascript tagged template strings. [Read in russian](https://github.com/vasiliy-lector/nano-parser/blob/master/README_RU.md)

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
**any**, **sequence** and **repeat** designed to combine other parsers with each other.

### Subsidiary parsers
**optional**, **required** and **defer** are subsidiary. **optional** makes parser optional, **required** makes parser strictly necessary and **defer** provides the possibility to call the parser from itself.

### Class Parser
All parsers return a instance of class **Parser**. Therefore, they have the same interface. The **exec** method is internal and is used to call from other parsers. Instead, use the **parse** method. The **parse** method takes the first argument string or array of strings, optional second parameter values are values that will be available as the second parameter of the method **then**. To cache the results use **useCache** method.

