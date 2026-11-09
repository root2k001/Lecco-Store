const fs = require('fs');
let c = fs.readFileSync('src/PaginaInicio/Inicio.jsx', 'utf8');

c = c.replace(/import '\.\/inicio\.css';/g, 'import styles from \'./Inicio.module.css\';');
c = c.replace(/className="([^"]+)"/g, (match, classes) => {
    const classList = classes.split(' ').map(cls => `\${styles['${cls}'] || '${cls}'}`).join(' ');
    return `className={\`${classList}\`}`;
});

fs.writeFileSync('src/PaginaInicio/Inicio.jsx', c);
console.log('Fixed Inicio.jsx');
