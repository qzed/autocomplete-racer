# Rust Autocomplete Package for Atom

Racer-based [autocomplete-plus][atom-autocomplete] and [hyperclick][atom-hyperclick] provider. Includes
markdown-styled documentation.

## Demo
![Demonstration](https://raw.githubusercontent.com/qzed/autocomplete-racer/master/img/demo.png)

## Features
- Includes documentation (can be disabled).
- Hyperclick support (for go-to-definition command).

## Installation
This package requires [racer][racer] to be available using the path variable. It is recommended that you set up
your rust toolchain using `rustup` and add the source component (`rust-src`). This way the complete setup is
managed by `rustup` and `racer` can automatically detect the location of the rust source code. Alternatively
you have to set the `RUST_SRC_PATH` environment-variable. For more details, see the [racer GitHub page][racer].

Furthermore, this package requires `autocomplete-plus`, which is bundled with atom. You may want to install
`hyperclick` for go-to-definition commands.


[racer]: https://github.com/phildawes/racer
[atom-autocomplete]: https://github.com/atom/autocomplete-plus
[atom-hyperclick]: https://github.com/facebooknuclide/hyperclick
