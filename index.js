const dotProp      = require('dot-prop');
const jfFileSystem = require('jf-file-system');
const path         = require('path');
/**
 * Genera el archivo índice de un paquete hecho en ECMAScript.
 * El índice luego puede ser exportado usando webpack o algún
 * otro empaquetador.
 *
 * @author    Joaquín Fernández
 * @namespace jf
 * @class     jf.BuildIndex
 * @extends   jf.FileSystem
 */
class jfBuildIndex extends jfFileSystem
{
    /**
     * Constructor de la clase.
     *
     * @constructor
     */
    constructor()
    {
        super();
        /**
         * Objeto donde se agregarán las clases encontrados.
         *
         * @type {Object}
         */
        this.classes = {};
        /**
         * Fecha de creación del índice.
         *
         * @type {Date}
         */
        this.created = new Date();
        /**
         * Descripción a colocar en el archivo generado.
         *
         * @type {String}
         */
        this.description = 'Archivo índice creado con `build-index`.';
        /**
         * Extensión del índice a generar.
         *
         * @type {String}
         */
        this.extension = 'mjs';
        /**
         * Texto a colocar como pie de página del documento.
         *
         * @type {String}
         */
        this.footer = '';
        /**
         * Texto a colocar como cabecera del documento.
         *
         * @type {String}
         */
        this.header = '';
        /**
         * Objeto donde se agregarán los archivos encontrados para importarlos.
         *
         * @type {Object[]}
         */
        this.imports = [];
        /**
         * Directorio con el código fuente.
         *
         * @type {String}
         */
        this.indir = '';
        /**
         * Nombre del módulo.
         *
         * @type {String}
         */
        this.name = '';
        /**
         * Ruta al archivo `package.json`.
         * Las claves de este archivo se fusionarán con los valores de la instancia.
         *
         * @type {String}
         */
        this.package = '';
        /**
         * Expresión regular para verificar si el archivo encontrado debe ser
         * incluido en el índice.
         *
         * @type {RegExp}
         */
        this.testFile = /^(.+)\.(m?js|es\d)$/i;
        /**
         * Ruta de la plantilla a usar para renderizar el archivo.
         *
         * @type {String}
         */
        this.tpl = path.join(__dirname, 'index.hbs');
    }

    /**
     * Construye el índice y lo guarda en disco.
     */
    build()
    {
        this.loadOptions();
        this.loadFiles();
        const _outfile = `${this.indir}index.${this.extension}`;
        const _content = require('handlebars')
            .compile(this.loadTpl())(
                Object.assign(
                    {
                        content : this.formatClasses()
                    },
                    this
                )
            )
            .trim();
        // console.log('%s\n%s\n%s\n', _outfile, '-'.repeat(_outfile.length), _content);
        this.write(_outfile, _content + '\n');
    }

    /**
     * Convierte una lista de palabras a formato `camelCase`.
     *
     * @param {String} text Texto a convertir.
     *
     * @return {String} Texto convertido.
     */
    camelize(text)
    {
        return text.replace(
            /[^a-zA-Z]+(.?)/g,
            (match, letter) => letter.toUpperCase()
        );
    }

    /**
     * Convierte la primera letra de un texto a mayúsculas.
     *
     * @param {String} text Texto a convertir.
     *
     * @return {String} Texto convertido.
     */
    capitalize(text)
    {
        return text[0].toUpperCase() + text.substr(1);
    }

    /**
     * Formatea el objeto que tiene las clases.
     *
     * @return {String} Objeto formateado e indentado.
     */
    formatClasses()
    {
        return JSON.stringify(this.classes, null, 4)
                   .replace(/^(\s+)"(\w+)"/gm, "$1'$2'")
                   .replace(/"/g, '')
                   .replace(/:/g, ' :') + ';'
    }

    /**
     * Genera el listado de archivos a incluir en el índice.
     */
    loadFiles()
    {
        const _classes = this.classes;
        const _imports = this.imports;
        let _dir       = this.indir;
        if (_dir.substr(-1) !== path.sep)
        {
            _dir += path.sep;
            this.indir = _dir;
        }
        this.log('log', '', 'Buscando archivos en el directorio: %s', _dir);
        const _files = this.scandir(_dir, this.testFile);
        this.log('log', '', 'Archivos encontrados: %d', _files.length);
        _files
            .sort((file1, file2) => file1.toLowerCase().localeCompare(file2.toLowerCase()))
            .forEach(
                file =>
                {
                    const _path = this.parse(file);
                    if (_path)
                    {
                        const _name = this.capitalize(this.camelize(_path));
                        dotProp.set(_classes, _path, _name);
                        _imports.push(
                            {
                                name : _name,
                                file : path.relative(_dir, file)
                            }
                        );
                    }
                }
            );
        this.log('log', '', 'Archivos a importar: %d', _imports.length);
    }

    /**
     * Lee las opciones de la línea de comandos y se las asigna a la instancia.
     */
    loadOptions()
    {
        const _getOpt  = require('node-getopt')
            .create(
                [
                    //@formatter:off
                    ['d', 'description=ARG', 'Descripción a colocar en el archivo generado.'           ],
                    ['e', 'extension=ARG',   'Extensión del archivo a generar.'                        ],
                    ['f', 'footer=ARG',      'Texto a colocar como pie de página del documento.'       ],
                    ['h', 'header=ARG',      'Texto a colocar como cabecera del documento.'            ],
                    ['i', 'indir=ARG',       'Directorio con el código fuente (obligatorio).'          ],
                    ['n', 'name=ARG',        'Nombre del módulo.'                                      ],
                    ['p', 'package=ARG',     'Ruta al archivo `package.json`.'                         ],
                    ['t', 'tpl=ARG',         'Ruta de la plantilla a usar para renderizar el archivo.' ]
                    //@formatter:on
                ]
            )
            .bindHelp();
        const _options = _getOpt.parseSystem().options;
        if (_options.indir)
        {
            this.log('log', '', 'Aplicando las opciones de la línea de comandos');
            Object.assign(this, _options);
            if (_options.package)
            {
                Object.assign(this, require(_options.package));
            }
        }
        else
        {
            _getOpt.showHelp();
            process.exit();
        }
    }

    /**
     * Carga la plantilla y devuelve su contenido.
     *
     * @return {String} Contenido de la plantilla.
     */
    loadTpl()
    {
        return this.read(this.tpl);
    }

    /**
     * Analiza la ruta del archivo y la convierte a una ruta separada por `.`.
     *
     * @param {String} filename Ruta del archivo.
     *
     * @return {String} Ruta usando `.` o una cadena vacía si el archivo no debe ser agregado al índice.
     */
    parse(filename)
    {
        let _name = path.basename(filename).match(this.testFile);
        if (_name && _name[1] !== 'index')
        {
            let _isClass = this.read(filename).match(/\*\s*@class /);
            filename     = path.relative(this.indir, filename)
                .split(path.sep)
                .map(
                    (p, i, a) => i === a.length - 1
                        ? _isClass
                                     ? this.capitalize(this.camelize(_name[1]))
                                     : _name[1]
                        : this.camelize(p)
                )
                .join('.');
        }
        else
        {
            filename = '';
        }
        return filename;
    }
}
module.exports = jfBuildIndex;
//--------------------------------------------------------------------------------
// Inicio del script
// Si no estamos ejecutando directamente este archivo, omitimos el proceso.
// Esto permite que una clase hija pueda modificar el comportamiento.
//--------------------------------------------------------------------------------
if (process.argv[1] === __filename)
{
    new jfBuildIndex().build();
}
