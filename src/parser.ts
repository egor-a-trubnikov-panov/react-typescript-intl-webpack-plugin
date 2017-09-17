import ts = require("typescript");

function isJsxOpeningLike(node) {
  return (
    node.kind === ts.SyntaxKind.JsxOpeningElement ||
    node.kind === ts.SyntaxKind.JsxSelfClosingElement
  );
}
/** True if this is visible outside this file, false otherwise */
// function isNodeExported(node: ts.Node): boolean {
//   return (node.flags & ts.NodeFlags.ExportContext) !== 0 || (node.parent && node.parent.kind === ts.SyntaxKind.SourceFile);
// }
function isDefineMessages(el, tagName) {
  return (
    (el.kind === ts.SyntaxKind.VariableDeclaration) &&
    el.initializer &&
    el.initializer.expression &&
    el.initializer.expression.text === tagName
  );
}

function findProps(node) {
  let res: any = [];
  find(node);

  function find(node) {
    if (!node) {
      return undefined;
    }
    if (node.kind === ts.SyntaxKind.ObjectLiteralExpression) {
      node.properties.forEach(p => {
        // let props = {};
        let prop = {};
        if (p.initializer.properties) {
          p.initializer.properties.forEach(ip => {
            prop[ip.name.text] = ip.initializer.text;
          });
          res.push(prop);
        }
      });
    }
    return ts.forEachChild(node, find);
  }

  return res;
}

function findFirstJsxOpeningLikeElementWithName(
  node,
  tagName,
  dm?
) {
  let res:any = [];
  find(node);

  function find(node) {
    if (!node) {
      return undefined;
    }
    if (dm && node.getNamedDeclarations) {
      let nd = node.getNamedDeclarations();

      nd.forEach(element => {

        element.forEach(el => {
          if (isDefineMessages(el, tagName)) {
            if (
              el.initializer.kind === ts.SyntaxKind.CallExpression &&
              el.initializer.arguments.length
            ) {
              let nodeProps = el.initializer.arguments[0];
              let props = findProps(nodeProps);
              // props.forEach(p => res.push(p));

              res = res.concat(props);
            }
          }
        });
      });
    } else {
      // Is this a JsxElement with an identifier name?
      if (
        isJsxOpeningLike(node) &&
        node.tagName.kind === ts.SyntaxKind.Identifier
      ) {
        // Does the tag name match what we're looking for?
        const childTagName = node.tagName;
        if (childTagName.text === tagName) {
          res.push(node);
        }
      }
    }

    return ts.forEachChild(node, find);
  }

  return res;
}
/* *
 * Parse tsx files
 * @export
 * @param {string} contents
 * @returns {array}
 * */
function main(contents) {

  let sourceFile = ts.createSourceFile(
    "file.ts",
    contents,
    ts.ScriptTarget.ES2015,
    /*setParentNodes */
    false,
    ts.ScriptKind.TSX
  );

  let elements = findFirstJsxOpeningLikeElementWithName(
    sourceFile,
    "FormattedMessage"
  );
  let dm = findFirstJsxOpeningLikeElementWithName(
    sourceFile,
    "defineMessages",
    true
  );

  const emptyObject = o => JSON.stringify(o) === "{}";
  let res = elements
    .map(element => {
      let msg = {};
      debugger;
      element.attributes &&
        element.attributes.properties.forEach(attr => {
          // found nothing
          if (!attr.name || !attr.initializer) return;
          msg[attr.name.text] =
            attr.initializer.text || attr.initializer.expression.text;
        });
      return msg;
    })
    .filter(r => !emptyObject(r));

  return res.concat(dm);
}

export default main;
