import * as linkify from 'linkifyjs'
import { marked } from 'marked'
import hljs from 'highlight.js'
// require('linkifyjs/plugins/hashtag')(linkify)

export default (text, doLinkify, textFormatting) => {
	const typeMarkdown = {
		bold: textFormatting.bold,
		italic: textFormatting.italic,
		strike: textFormatting.strike,
		underline: textFormatting.underline,
		multilineCode: textFormatting.multilineCode,
		inlineCode: textFormatting.inlineCode
	}

	const pseudoMarkdown = {
		[typeMarkdown.bold]: {
			end: '\\' + typeMarkdown.bold,
			allowed_chars: '.',
			type: 'bold'
		},
		[typeMarkdown.italic]: {
			end: typeMarkdown.italic,
			allowed_chars: '.',
			type: 'italic'
		},
		[typeMarkdown.strike]: {
			end: typeMarkdown.strike,
			allowed_chars: '.',
			type: 'strike'
		},
		[typeMarkdown.underline]: {
			end: typeMarkdown.underline,
			allowed_chars: '.',
			type: 'underline'
		},
		[typeMarkdown.multilineCode]: {
			end: typeMarkdown.multilineCode,
			allowed_chars: '(.|\n)',
			type: 'multiline-code'
		},
		[typeMarkdown.inlineCode]: {
			end: typeMarkdown.inlineCode,
			allowed_chars: '.',
			type: 'inline-code'
		},
		'<usertag>': {
			allowed_chars: '.',
			end: '</usertag>',
			type: 'tag'
		}
	}

  let prevLang = null
  marked.setOptions({
    renderer: new marked.Renderer(), // 这是必填项
    gfm: true,	// 启动类似于Github样式的Markdown语法
    pedantic: false, // 只解析符合Markdown定义的，不修正Markdown的错误
    sanitize: false, // 原始输出，忽略HTML标签（关闭后，可直接渲染HTML标签）
    // 高亮的语法规范
    highlight: (code, lang) => {
      prevLang = lang || prevLang
      lang = lang || prevLang || 'Markdown'
      // console.log('highlight code with lang ', lang)
      return hljs.highlight(code, { language: lang }).value
    }
  })
  // console.log('md', md)
  const doc = new DOMParser().parseFromString(marked(text), 'text/html')
  const tables = doc.getElementsByTagName('table')
  for (let i = 0; i < tables.length; i++) {
    const table = tables[i]
    const div = document.createElement('div')
    div.className = 'md-table-container'
    table.parentNode.insertBefore(div, table)
    div.appendChild(table)
  }
  const htmlStringFromDoc = new XMLSerializer().serializeToString(doc.body)
  return [{
    value: htmlStringFromDoc.substring(43, htmlStringFromDoc.length - 7)
  }]

// 	const json = compileToJSON(text, pseudoMarkdown)
// console.log('json', json)
// 	const html = compileToHTML(json, pseudoMarkdown)
//   console.log('html', html)
// 	const result = [].concat.apply([], html)
//
// 	if (doLinkify) linkifyResult(result)
//
// 	return result
}

function compileToJSON(str, pseudoMarkdown) {
	let result = []
	let minIndexOf = -1
	let minIndexOfKey = null

	let links = linkify.find(str)
	let minIndexFromLink = false

	if (links.length > 0) {
		minIndexOf = str.indexOf(links[0].value)
		minIndexFromLink = true
	}

	Object.keys(pseudoMarkdown).forEach(startingValue => {
		const io = str.indexOf(startingValue)
		if (io >= 0 && (minIndexOf < 0 || io < minIndexOf)) {
			minIndexOf = io
			minIndexOfKey = startingValue
			minIndexFromLink = false
		}
	})

	if (minIndexFromLink && minIndexOfKey !== -1) {
		let strLeft = str.substr(0, minIndexOf)
		let strLink = str.substr(minIndexOf, links[0].value.length)
		let strRight = str.substr(minIndexOf + links[0].value.length)
		result.push(strLeft)
		result.push(strLink)
		result = result.concat(compileToJSON(strRight, pseudoMarkdown))
		return result
	}

	if (minIndexOfKey) {
		let strLeft = str.substr(0, minIndexOf)
		const char = minIndexOfKey
		let strRight = str.substr(minIndexOf + char.length)

		if (str.replace(/\s/g, '').length === char.length * 2) {
			return [str]
		}

		const match = strRight.match(
			new RegExp(
				'^(' +
					(pseudoMarkdown[char].allowed_chars || '.') +
					'*' +
					(pseudoMarkdown[char].end ? '?' : '') +
					')' +
					(pseudoMarkdown[char].end
						? '(' + pseudoMarkdown[char].end + ')'
						: ''),
				'm'
			)
		)
		if (!match || !match[1]) {
			strLeft = strLeft + char
			result.push(strLeft)
		} else {
			if (strLeft) {
				result.push(strLeft)
			}
			const object = {
				start: char,
				content: compileToJSON(match[1], pseudoMarkdown),
				end: match[2],
				type: pseudoMarkdown[char].type
			}
			result.push(object)
			strRight = strRight.substr(match[0].length)
		}
		result = result.concat(compileToJSON(strRight, pseudoMarkdown))
		return result
	} else {
		if (str) {
			return [str]
		} else {
			return []
		}
	}
}

function compileToHTML(json, pseudoMarkdown) {
	const result = []

	json.forEach(item => {
		if (typeof item === 'string') {
			result.push({ types: [], value: item })
		} else {
			if (pseudoMarkdown[item.start]) {
				result.push(parseContent(item))
			}
		}
	})

	return result
}

function parseContent(item) {
	const result = []
	iterateContent(item, result, [])
	return result
}

function iterateContent(item, result, types) {
	item.content.forEach(it => {
		if (typeof it === 'string') {
			result.push({
				types: removeDuplicates(types.concat([item.type])),
				value: it
			})
		} else {
			iterateContent(
				it,
				result,
				removeDuplicates([it.type].concat([item.type]).concat(types))
			)
		}
	})
}

function removeDuplicates(items) {
	return [...new Set(items)]
}

function linkifyResult(array) {
	const result = []

	array.forEach(arr => {
		const links = linkify.find(arr.value)

		if (links.length) {
			const spaces = arr.value.replace(links[0].value, '')
			result.push({ types: arr.types, value: spaces })

			arr.types = ['url'].concat(arr.types)
			arr.href = links[0].href
			arr.value = links[0].value
		}

		result.push(arr)
	})

	return result
}
