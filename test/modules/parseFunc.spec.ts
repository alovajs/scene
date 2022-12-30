import { parseFunctionBody, parseFunctionParams } from '../../src/helper';

describe('parse function', () => {
  test('get common function params', () => {
    let params = parseFunctionParams(function (a, b, c) {
      console.log(a, b, c);
    });
    expect(params).toStrictEqual(['a', 'b', 'c']);

    params = parseFunctionParams(function () {
      // ...
    });
    expect(params).toStrictEqual([]);

    params = parseFunctionParams(function (a /* = 1 */, b /* = true */) {
      console.log(a, b);
    });
    expect(params).toStrictEqual(['a', 'b']);

    params = parseFunctionParams(function named(a, b, c) {
      console.log(a, b, c);
    });
    expect(params).toStrictEqual(['a', 'b', 'c']);

    params = parseFunctionParams(function fprintf(handle, fmt /*, I'm a comment,...*/) {
      console.log(handle, fmt);
    });
    expect(params).toStrictEqual(['handle', 'fmt']);

    params = parseFunctionParams(function named(a: any, b: any, c: any) {
      console.log(a, b, c);
    });
    expect(params).toStrictEqual(['a', 'b', 'c']);

    // prettier-ignore
    params = parseFunctionParams(function ( asd23, bdsag2  = 1,  cg32  ) {
      console.log(asd23, bdsag2, cg32);
    });
    expect(params).toStrictEqual(['asd23', 'bdsag2', 'cg32']);

    // prettier-ignore
    params = parseFunctionParams(function ( a   =  4  * ( 5/ 3), b) {
      console.log(a, b);
    });
    expect(params).toStrictEqual(['a', 'b']);

    // prettier-ignore
    params = parseFunctionParams(function (a /* fooled you... {
      */, b,
      c) {
      console.log(a, b, c);
    });
    expect(params).toStrictEqual(['a', 'b', 'c']);

    // prettier-ignore
    params = parseFunctionParams(function (_$9sdfljka /* function() yes */,
     /* no, */b8765asfg987n8)/* omg! */{
      console.log(_$9sdfljka, b8765asfg987n8);
    });
    expect(params).toStrictEqual(['_$9sdfljka', 'b8765asfg987n8']);

    // prettier-ignore
    params = parseFunctionParams(function ( A, b 
      ,c ,d 
       )
     {
      console.log(A, b, c, d);
    });
    expect(params).toStrictEqual(['A', 'b', 'c', 'd']);

    // prettier-ignore
    params = parseFunctionParams(function named(aaaaa = { aa: 1,bb: 'sdafea', cc: [
      1.2,
      'aa',
      true
    ] }, bbbbbb, c_290$$$) {
      console.log(aaaaa, bbbbbb, c_290$$$);
    });
    expect(params).toStrictEqual(['aaaaa', 'bbbbbb', 'c_290$$$']);

    params = parseFunctionParams(function (a, b, ...ccc) {
      console.log(a, b, ccc);
    });
    expect(params).toStrictEqual(['a', 'b', '...ccc']);
  });

  test('get arrow function params', () => {
    let params = parseFunctionParams((a, b, c) => {
      console.log(a, b, c);
    });
    expect(params).toStrictEqual(['a', 'b', 'c']);

    params = parseFunctionParams(() => {
      // ...
    });
    expect(params).toStrictEqual([]);

    params = parseFunctionParams((a /* = 1 */, b /* = true */) => {
      console.log(a, b);
    });
    expect(params).toStrictEqual(['a', 'b']);

    params = parseFunctionParams($_sdaf7hsda98n7f => {
      console.log($_sdaf7hsda98n7f);
    });
    expect(params).toStrictEqual(['$_sdaf7hsda98n7f']);

    params = parseFunctionParams((handle, fmt /*, I'm a comment,...*/) => {
      console.log(handle, fmt);
    });
    expect(params).toStrictEqual(['handle', 'fmt']);

    // prettier-ignore
    params = parseFunctionParams(( asd23, bdsag2  = 1,  cg32  ) => {
      console.log(asd23, bdsag2, cg32);
    });
    expect(params).toStrictEqual(['asd23', 'bdsag2', 'cg32']);

    // prettier-ignore
    params = parseFunctionParams(( a   =  4  * ( 5/ 3), b)=>   {
      console.log(a, b);
    });
    expect(params).toStrictEqual(['a', 'b']);

    // prettier-ignore
    params = parseFunctionParams((a /* fooled you... {
      */, b,
      c)   => {
      console.log(a, b, c);
    });
    expect(params).toStrictEqual(['a', 'b', 'c']);

    // prettier-ignore
    params = parseFunctionParams((_$9sdfljka /* function() yes */,
     /* no, */b8765asfg987n8)/* omg! */=>{
      console.log(_$9sdfljka, b8765asfg987n8);
    });
    expect(params).toStrictEqual(['_$9sdfljka', 'b8765asfg987n8']);

    // prettier-ignore
    params = parseFunctionParams(( A, b 
      ,c ,d 
       )=>
     {
      console.log(A, b, c, d);
    });
    expect(params).toStrictEqual(['A', 'b', 'c', 'd']);

    // prettier-ignore
    params = parseFunctionParams((aaaaa = { aa: 1,bb: 'sdafea', cc: [
      1.2,
      'aa',
      true
    ] }, bbbbbb, c_290$$$) =>
    {
      console.log(aaaaa, bbbbbb, c_290$$$);
    });
    expect(params).toStrictEqual(['aaaaa', 'bbbbbb', 'c_290$$$']);

    params = parseFunctionParams((a, b, ...ccc) => {
      console.log(a, b, ccc);
    });
    expect(params).toStrictEqual(['a', 'b', '...ccc']);
  });

  test('get common function body', () => {
    // prettier-ignore
    let parsedBody = parseFunctionBody(function(  )   {

      function abc() {
        let dothing = false;
        // dothing...
        console.log(dothing);
        dothing = true;
        return Math.random()
      }
      let ddd = abc();
      // 单行注释
      if (ddd > 0) {
        /**
         * 多行注释
         * 随便写....
         */
        console.log(ddd);
      }
    })
    expect(() => {
      new Function(parsedBody);
    }).not.toThrow();

    // prettier-ignore
    parsedBody = parseFunctionBody(function named(a = 1, b = {a: 1}, c  )   {
      let ddd = a +  b  +  c;
      // 单行注释
      if (ddd > 0) {
        /**
         * 多行注释
         * 随便写....
         */
        console.log(ddd);
      }
    })
    expect(() => {
      new Function(parsedBody);
    }).not.toThrow();

    // prettier-ignore
    parsedBody = parseFunctionBody(function (a /* fooled you... {
      */, b,
      c)   {

      function abc() {
        let dothing = false;
        // dothing...
        console.log(dothing);
        dothing = true;
        return Math.random()
      }
      let ddd = abc() + a() + b +   c;
      // 单行注释
      if (ddd > 0) {
        /**
         * 多行注释
         * 随便写....
         */
        console.log(ddd);
      }
    })
    expect(() => {
      new Function(parsedBody);
    }).not.toThrow();

    // prettier-ignore
    parsedBody = parseFunctionBody(function (a /* fooled you... {
      */, b,
      c)   {

      function abc() {
        let dothing = false;
        // dothing...
        console.log(dothing);
        dothing = true;
        return Math.random()
      }
      let ddd = abc() + a() + b +   c;
      // 单行注释
      if (ddd > 0) {
        /**
         * 多行注释
         * 随便写....
         */
        console.log(ddd);
      }
    })
    expect(() => {
      new Function(parsedBody);
    }).not.toThrow();

    // prettier-ignore
    parsedBody = parseFunctionBody('function anonymous(\n) {\nreturn 123\n}')
    expect(() => {
      new Function(parsedBody);
    }).not.toThrow();
  });

  test('get arrow function body', () => {
    // prettier-ignore
    let parsedBody = parseFunctionBody((  ) => 
     {

      function abc() {
        let dothing = false;
        // dothing...
        console.log(dothing);
        dothing = true;
        return Math.random()
      }
      let ddd = abc();
      // 单行注释
      if (ddd > 0) {
        /**
         * 多行注释
         * 随便写....
         */
        console.log(ddd);
      }
    })
    expect(() => {
      new Function(parsedBody);
    }).not.toThrow();

    // prettier-ignore
    parsedBody = parseFunctionBody((a = 1, b = {a: 1}, c  )   =>{
      let ddd = a +  b  +  c;
      // 单行注释
      if (ddd > 0) {
        /**
         * 多行注释
         * 随便写....
         */
        console.log(ddd);
      }
    })
    expect(() => {
      new Function(parsedBody);
    }).not.toThrow();

    // prettier-ignore
    parsedBody = parseFunctionBody((a /* fooled you... {
      */, b,
      c)  => {

      function abc() {
        let dothing = false;
        // dothing...
        console.log(dothing);
        dothing = true;
        return Math.random()
      }
      let ddd = abc() + a() + b +   c;
      // 单行注释
      if (ddd > 0) {
        /**
         * 多行注释
         * 随便写....
         */
        console.log(ddd);
      }
    })
    expect(() => {
      new Function(parsedBody);
    }).not.toThrow();

    // prettier-ignore
    parsedBody = parseFunctionBody(_987dsfasdf /* fooled you... {*/  => {

      function abc() {
        let dothing = false;
        // dothing...
        console.log(dothing);
        dothing = true;
        return Math.random()
      }
      let ddd = abc() + _987dsfasdf;
      // 单行注释
      if (ddd > 0) {
        /**
         * 多行注释
         * 随便写....
         */
        console.log(ddd);
      }
    })
    expect(() => {
      new Function(parsedBody);
    }).not.toThrow();

    // prettier-ignore
    parsedBody = parseFunctionBody((a /* fooled you... {
      */, b,
      c)  => a + b ? c : a - c ? 1 : 0)
    expect(() => {
      new Function(parsedBody);
    }).not.toThrow();
    expect(parsedBody.startsWith('return')).toBeTruthy();

    // prettier-ignore
    parsedBody = parseFunctionBody('(\n)=> \n {\nreturn 123\n}')
    expect(() => {
      new Function(parsedBody);
    }).not.toThrow();
  });
});
