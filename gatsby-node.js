const _ = require('lodash')
const axios = require('axios')
const path = require('path')
const { createFilePath } = require('gatsby-source-filesystem')
const { fmImagesToRelative } = require('gatsby-remark-relative-images')

// explicit Frontmatter declaration to make category, author and date, optionals. 
exports.createSchemaCustomization = ({ actions }) => {
  const { createTypes } = actions
  const typeDefs = `
    type MarkdownRemark implements Node {
      frontmatter: Frontmatter
    }
    type Frontmatter {
      category: [Category]
      author: String
      date: Date @dateformat(formatString: "DD/MM/YYYY")
    }
    type Category {
      label: String
    }
  `
  createTypes(typeDefs)
}

exports.createPages = ({ actions, graphql }) => {
  const { createPage } = actions

  return graphql(`
    {
      allMarkdownRemark(limit: 1000) {
        edges {
          node {
            id
            fields {
              slug
            }
            frontmatter {
              category {
                label
              }
              author
              templateKey
            }
          }
        }
      }
    }
  `).then(result => {
    if (result.errors) {
      result.errors.forEach(e => console.error(e.toString()))
      return Promise.reject(result.errors)
    }

    const posts = result.data.allMarkdownRemark.edges

    posts.forEach(edge => {
      const id = edge.node.id
      if (edge.node.fields.slug.match(/pages/)) {
        edge.node.fields.slug = edge.node.fields.slug.replace('/pages/', '/');
      }
      createPage({
        path: edge.node.fields.slug,
        category: edge.node.frontmatter.category,
        component: path.resolve(
          `src/templates/${String(edge.node.frontmatter.templateKey)}.js`
        ),
        // additional data can be passed via context
        context: {
          id,
        },
      })
    })

    // category pages:
    let categories = []
    // Iterate through each post, putting all found categories into `categories`
    posts.forEach(edge => {
      if (_.get(edge, `node.frontmatter.category`)) {
        categories = categories.concat(edge.node.frontmatter.category[0].label)
      }
    })
    // Eliminate duplicate categories
    categories = _.uniq(categories)

    // Make category pages
    categories.forEach(category => {
      const categoriePath = `/category/${_.kebabCase(category)}/`

      createPage({
        path: categoriePath,
        component: path.resolve(`src/templates/tags.js`),
        context: {
          category,
        },
      })
    })

    // author pages:
    let authors = []
    // Iterate through each post, putting all found authors into `authors`    
    posts.forEach(edge => {
      if (_.get(edge, `node.frontmatter.author`)) {
        authors = authors.concat(edge.node.frontmatter.author)
      }
    })
    // Eliminate duplicate categories
    authors = _.uniq(authors)

    // Make category pages
    authors.forEach(author => {
      const authorPath = `/author/${_.kebabCase(author)}/`

      createPage({
        path: authorPath,
        component: path.resolve(`src/templates/tags.js`),
        context: {
          author,
        },
      })
    })
  })
}

exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions
  fmImagesToRelative(node) // convert image paths for gatsby images

  if (node.internal.type === `MarkdownRemark`) {
    const value = createFilePath({ node, getNode })
    createNodeField({
      name: `slug`,
      node,
      value,
    })
  }
}