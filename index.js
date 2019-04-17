#!/usr/bin/env node

const cc2sep       = require('@jf/cc2sep');
const jfFileSystem = require('@jf/fs');
const Mustache     = require('mustache');
const path         = require('path');
const propSep      = require('@jf/prop-sep');
const sep2cc       = require('@jf/sep2cc');

/**
 * Genera el archivo índice de un paquete hecho usando módulos ECMAScript o CommonJS.
 * El índice luego puede ser exportado usando webpack o algún
 * otro empaquetador.
 *
 * @namespace jf
 * @class     jf.Index
 * @extends   jf.FileSystem
 */
class jfIndex extends jfFileSystem
{
    /**
     * @override
     */
    constructor()
    {
        super();
        /**
         * Objeto donde se agregarán las clases encontrados.
         *
         * @property classes
         * @type     {object}
         */
        this.classes = {};
        /**
         * Fecha de creación del índice.
         *
         * @property created
         * @type     {string}
         */
        this.created = new Date().toISOString();
        /**
         * Descripción a colocar en el archivo generado.
         *
         * @property descrìption
         * @type     {string}
         */
        this.description = '';
        /**
         * Extensión del índice a generar.
         *
         * @property extension
         * @type     {string}
         */
        this.extension = 'js';
        /**
         * Texto a colocar como pie de página del documento.
         *
         * @property footer
         * @type     {string}
         */
        this.footer = '';
        /**
         * Texto a colocar como cabecera del documento.
         *
         * @property header
         * @type     {string}
         */
        this.header = '';
        /**
         * Objeto donde se agregarán los archivos encontrados para importarlos.
         *
         * @property imports
         * @type     {object[]}
         */
        this.imports = [];
        /**
         * Directorio con el código fuente.
         *
         * @property indif
         * @type     {string}
         */
        this.indir = '';
        /**
         * Nombre del módulo.
         *
         * @property name
         * @type     {string}
         */
        this.name = '';
        /**
         * Ruta al archivo `package.json`.
         * Las claves de este archivo se fusionarán con los valores de la instancia.
         *
         * @property package
         * @type     {string}
         */
        this.package = '';
        /**
         * Indica si se escribe en disco o se muestra por pantalla el resultado.
         *
         * @property save
         * @type     {boolean}
         */
        this.save = false;
        /**
         * Expresión regular para verificar si el archivo encontrado debe ser
         * incluido en el índice.
         *
         * @property testFile
         * @type     {RegExp}
         */
        this.testFile = /\.(m?js|es\d?)$/i;
        /**
         * Ruta de la plantilla a usar para renderizar el archivo.
         *
         * @property tpl
         * @type     {string}
         */
        this.tpl = '';
    }

    /**
     * Construye el índice y lo guarda en disco.
     */
    build()
    {
        this.loadOptions();
        this.loadFiles();
        const _outfile = `${this.indir}index.${this.extension}`;
        const _content = Mustache
            .render(
                this.loadTpl(),
                Object.assign(
                    {
                        content : this.formatClasses()
                    },
                    this
                ),
                {
                    header : this.read(path.join(__dirname, 'tpl', 'partials', 'header.hbs'))
                }
            )
            .trim();
        if (this.write)
        {
            this.write(_outfile, _content + '\n');
        }
        else
        {
            console.log('%s\n%s\n%s\n', _outfile, '-'.repeat(_outfile.length), _content);
        }
    }

    /**
     * Convierte una lista de palabras a formato `camelCase`.
     *
     * @param {string}  text       Texto a convertir.
     * @param {boolean} capitalize Si es 'true' se convierte en mayúscula la primera letra.
     *
     * @return {string} Texto convertido.
     */
    camelize(text, capitalize = true)
    {
        return sep2cc(cc2sep(text).replace(/[\W_]+/g, '-'), '-', capitalize);
    }

    /**
     * Convierte la primera letra de un texto a mayúsculas.
     *
     * @param {string} text Texto a convertir.
     *
     * @return {string} Texto convertido.
     */
    capitalize(text)
    {
        return text[0].toUpperCase() + text.substr(1);
    }

    /**
     * Busca el archivo `package.json` a partir del directorio de entrada.
     */
    findPackage()
    {
        if (this.package === '')
        {
            const _name = 'package.json';
            const _path = this.findUp(this.indir, _name);
            if (path.parse(_path).root !== _path)
            {
                this.package = path.join(_path, _name);
            }
        }
    }

    /**
     * Formatea el objeto que tiene las clases.
     *
     * @return {string} Objeto formateado e indentado.
     */
    formatClasses()
    {
        return JSON.stringify(this.classes, null, 4)
                   .replace(/"/g, '')
                   .replace(/:/g, ' :') + ';';
    }

    /**
     * Genera el listado de archivos a incluir en el índice.
     */
    loadFiles()
    {
        const _classes = this.classes;
        const _imports = this.imports;
        let _length    = [];
        const _module  = this.camelize(this.name);
        let _dir       = this.indir;
        if (_dir.substr(-1) !== path.sep)
        {
            _dir += path.sep;
            this.indir = _dir;
        }
        this.log('log', '', 'Buscando archivos en el directorio: %s', _dir);
        const _files = this.scandir(_dir).filter(f => this.testFile.test(f));
        this.log('log', '', 'Archivos encontrados: %d', _files.length);
        if (_files.length)
        {
            _files
                .sort((file1, file2) => file1.toLowerCase().localeCompare(file2.toLowerCase()))
                .forEach(
                    file =>
                    {
                        const _path = this.parse(file);
                        if (_path)
                        {
                            const _name = _module + _path.split('.').map(this.capitalize).join('');
                            propSep.set(_classes, _path, _name);
                            _length.push(_name.length);
                            _imports.push(
                                {
                                    name : _name,
                                    file : path.relative(_dir, file)
                                }
                            );
                        }
                    }
                );
            _length = Math.max(..._length);
            _imports.forEach(i => i.spaces = ' '.repeat(_length - i.name.length));
            this.log('log', '', 'Archivos a importar: %d', _imports.length);
        }
        else
        {
            this.log('log', '', 'No se encontraron archivos a importar.');
        }
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
                    ['s', 'save',            'Escribe el archivo en vez de mostrar por consola.'       ],
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
            this.findPackage();
            if (this.package)
            {
                Object.assign(this, require(this.package));
            }
            if (!this.tpl)
            {
                switch (this.extension)
                {
                    case 'js':
                        this.tpl = path.join(__dirname, 'tpl', 'node.hbs');
                        break;
                    case 'mjs':
                        this.tpl = path.join(__dirname, 'tpl', 'es6.hbs');
                        break;
                }
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
     * @return {string} Contenido de la plantilla.
     */
    loadTpl()
    {
        return this.read(this.tpl);
    }

    /**
     * Analiza la ruta del archivo y la convierte a una ruta separada por `.`.
     *
     * @param {string} filename Ruta del archivo.
     *
     * @return {string} Ruta usando `.` o una cadena vacía si el archivo no debe ser agregado al índice.
     */
    parse(filename)
    {
        let _name = path.basename(filename, path.extname(filename));
        if (_name === 'index')
        {
            filename = '';
        }
        else
        {
            const _isClass = this.read(filename).match(/(^|\*\s*@)class /) !== null;
            filename       = path.relative(this.indir, filename)
                .split(path.sep)
                .map(
                    (p, i, a) => i === a.length - 1
                        ? this.camelize(_name, _isClass)
                        : this.camelize(p, false)
                )
                .join('.');
        }
        return filename;
    }
}

module.exports = jfIndex;
//--------------------------------------------------------------------------------
// Inicio del script
// Si no estamos ejecutando directamente este archivo, omitimos el proceso.
// Esto permite que una clase hija pueda modificar el comportamiento.
//--------------------------------------------------------------------------------
if (require.main === module)
{
    process.argv.push();
    jfIndex.i().build();
}
