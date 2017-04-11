import jsdom from 'jsdom'
import fs from 'fs'

const testBundle = fs.readFileSync('./dist/datapackage.js', 'utf8')

export default testingClass => {
  const element = `<script>${testBundle}</script>`
  const document = jsdom.jsdom(element)
  const window = document.defaultView

  return window.datapackage[testingClass]
}
