import jsdom from 'jsdom'
import fs from 'fs'

const testBundle = fs.readFileSync('./dist/datapackage.js', 'utf8')

export default testingClass => {
  const document = jsdom.jsdom()
  const window = document.defaultView

  const scriptEl = document.createElement('script')
  scriptEl.textContent = testBundle
  document.body.appendChild(scriptEl)

  return window.datapackage[testingClass]
}
