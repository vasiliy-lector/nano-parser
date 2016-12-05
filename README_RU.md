# nano-parser
Пакет, предназначенный для упрощения парсинга тегированных шаблонных строк.

## Установка
```bash
npm install --save 'nano-parser';
```

## Использование
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

## Примеры использования:
* [es6x - реализация возможностей jsx на чистом javascript](https://github.com/vasiliy-lector/es6x)

## Введение
С помощью nano-parser Вы можете создавать сложные парсеры, комбинируя простые. Есть возможность трансформировать результаты с помощью метода **then**, а так же кешировать результаты для ускорения повторной обработки.

### Элементарные парсеры
**find**, **next** и **end** наиболее простые парсеры. **find** предназначен для поиска строк или регулярных выражений. **next** и **end** используются при парсинге массива строк (актуально для разбора шаблонных строк)

### Комбинаторы
**any**, **sequence** и **repeat** предназначены для комбинирования других парсеров друг с другом

### Вспомогательные парсеры
**optional**, **required** и **defer** являются вспомогательными. Они, соответственно, делают необязательным наличие парсера, строго обязательным, а **defer** служит для возможности обращения к парсеру из самого себя.

### Класс Parser
Все парсеры при создании возвращают instance класса **Parser**. Поэтому имеют один и тот же интерфейс. Метод **exec** - является внутренним - для вызова из других парсеров. Пользователю доступен метод **parse**. Метод **parse** принимает первым параметром строку или массив строк, которые необходимо распарсить, вторым параметром опционально значения values, которые будут доступны вторым же параметром из метода **then**. Для кеширования результатов предназначен метод **useCache**.

## Документация

### find
**find** используется для поиска по регулярному выражению или прямому совпадению со строкой.
Примеры:
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
Символ "^" рекомендуется использовать для оптимизации регулярного выражения.

### any
**any** дает возможность найти одно из совпадений.
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
    ).not(find('abcefg'));
    expect(parser.parse('ab')).toBe('ab');
    expect(parser.parse('fg')).toBe('fg');
    expect(parser.parse('abcef')).toBe('abcef');
    expect(parser.parse('abcefg')).toBe(undefined);
```

### sequence
С помощью **sequence** можно строить последовательности
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
В предыдущем примере вы можете видеть в действии полезный метод **then**, который есть у любого парсера. А так же, у любого парсера есть методы **not** и **useCache**. **then** и **not** возвращают новый парсер, поэтому можно смело образовывать новые сущности, не затрагивая существующие:
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
**repeat** используется для поиска повторяющихся последовательностей.
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

### optional
**optional** делает парсеры необязательными.
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
**required** будет не просто обрывать поиск, но и генерировать ошибку о том, что ожидаемые символы не найдены:
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

### next и end
**next** и **end** используются при парсинге массивов строк. **next** соответствуют промежутку между строками, **end** - конец массива. Эти методы удобны при парсинге тегированных шаблонных строк в es6.
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
**defer** полезен при создании рекурсивных парсеров.
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
