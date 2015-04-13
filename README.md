# movingai2json [![Build Status](https://travis-ci.org/THeK3nger/movingai2json.svg)](https://travis-ci.org/THeK3nger/movingai2json)

**MovingAI2JSON** is a simple *JavaScript* library to parse [Moving AI][2]
benchmark `.map` and `.scen` files into a JSON data structure.

The library also provide simple tools to handle the resulting objects, such as
computing tiles traversability and movement cost between adjacents tiles.


## Usage

### Library Usage

The library is composed by the main function `parseMapString(string)`. This function takes as argument the string representing the map in the MovingAI format. This string can be obtained by file or by any other input, it does not matter.

### CLI Usage

The program can be run in the command line in order to automaitcally convert all files in the specified folder.

    node movingai2json batch <folder_path>

This is useful to automatically convert a full benchmark database.

### Output

The output is a JSON data structure in this format:

    {
      height:// The map height.
      width: // The map width.
      type:  //The map type (octile is the default)
      matrix: [[tile]] // A matrix of tile chars.
    }


## TODO:

There is some additional features that can be implemented

 - [ ] Parser for the .scen files.
 - [ ] Utility functions to handle standard common operation on the map (distances, cost, traversability and so on).
 - [x] CLI to batch several .map file into .json files.

## License

The library is released under [the MIT license][1]

 [1]: LICENSE
 [2]: http://movingai.com/
