const fs      = require('fs');
const path    = require('path');
const pkgfile = path.resolve(__dirname, '..', '..', '..', 'package.json');
if (fs.existsSync(pkgfile))
{
    process.on(
        'exit',
        () =>
        {
            const pkg     = require(pkgfile);
            const scripts = pkg.scripts || (pkg.scripts = {});
            if (!scripts.index)
            {
                scripts.index = 'jf-index -i src/ -s';
                fs.writeFileSync(pkgfile, JSON.stringify(pkg, null, 4));
                console.log('%s\nscripts\n    index\n        %s\n', pkgfile, scripts.index);
            }
        }
    );
}
