Progeny
=======
Recursively finds dependencies of style and template source files


Usage
=====
Call progeny with an optional configuration object, it returns a reusable
function. There are built-in configurations already for `jade`, `stylus`,
`less`, and `sass`. Call that function with a path to a source file (and its
source code if you already have it handy), and it will figure out all of that
file's dependencies and sub-dependencies, passing an array of them to your
callback.


License
=======
[MIT](https://raw.github.com/es128/progeny/master/LICENSE)
