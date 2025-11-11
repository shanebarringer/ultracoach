/**
 * ESLint rule: require-atom-debug-label
 *
 * Ensures all exported Jotai atoms have debug labels using withDebugLabel()
 *
 * @module eslint-rules/require-atom-debug-label
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'require debug labels for all exported Jotai atoms',
      category: 'Best Practices',
      recommended: true,
    },
    messages: {
      missingDebugLabel:
        'Atom "{{ atomName }}" must have a debug label. Add withDebugLabel({{ atomName }}, "category/name") at the end of the file.',
      useWithDebugLabel:
        'Use withDebugLabel() instead of direct .debugLabel assignment for production optimization.',
    },
    schema: [],
  },

  create(context) {
    const exportedAtoms = new Set()
    const labeledAtoms = new Set()
    const directAssignments = []

    return {
      // Collect exported atom declarations
      ExportNamedDeclaration(node) {
        if (node.declaration) {
          // export const myAtom = atom(...)
          if (node.declaration.type === 'VariableDeclaration') {
            node.declaration.declarations.forEach(declarator => {
              if (
                declarator.id.type === 'Identifier' &&
                declarator.id.name.endsWith('Atom')
              ) {
                exportedAtoms.add(declarator.id.name)
              }
            })
          }
        }
      },

      // Detect withDebugLabel() calls
      CallExpression(node) {
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'withDebugLabel' &&
          node.arguments.length >= 2
        ) {
          const atomArg = node.arguments[0]
          if (atomArg.type === 'Identifier') {
            labeledAtoms.add(atomArg.name)
          }
        }
      },

      // Detect direct .debugLabel assignments (anti-pattern)
      AssignmentExpression(node) {
        if (
          node.left.type === 'MemberExpression' &&
          node.left.property.type === 'Identifier' &&
          node.left.property.name === 'debugLabel' &&
          node.left.object.type === 'Identifier'
        ) {
          // Check if it's wrapped in a NODE_ENV check
          let parent = node
          let isConditional = false

          // Traverse up to check for if statement
          while (parent && parent.type !== 'Program') {
            if (parent.type === 'IfStatement') {
              const test = parent.test
              // Check if it's checking NODE_ENV !== 'production'
              if (
                test.type === 'BinaryExpression' &&
                test.operator === '!==' &&
                test.left.type === 'MemberExpression' &&
                test.right.type === 'Literal' &&
                test.right.value === 'production'
              ) {
                isConditional = true
                break
              }
            }
            parent = context.getAncestors()[context.getAncestors().length - 1]
          }

          if (!isConditional) {
            directAssignments.push({
              node,
              atomName: node.left.object.name,
            })
          }
        }
      },

      // Report missing labels at the end of file traversal
      'Program:exit'() {
        // Report direct assignments (anti-pattern)
        directAssignments.forEach(({ node, atomName }) => {
          context.report({
            node,
            messageId: 'useWithDebugLabel',
            data: { atomName },
          })
        })

        // Report missing labels for exported atoms
        exportedAtoms.forEach(atomName => {
          if (!labeledAtoms.has(atomName)) {
            context.report({
              node: context.getSourceCode().ast,
              messageId: 'missingDebugLabel',
              data: { atomName },
            })
          }
        })
      },
    }
  },
}
