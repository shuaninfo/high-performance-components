
export class BigData {
  constructor() {
    this._data = [] // 海量数据 tree
    this.list = [] // 扁平化的tree
    this.filterList = [] // 根据关键词过滤后的list
    this.listMap = {} // this.big.list 对应的 map
    this.filterTree = [] // 根据关键词过滤后的tree
    this.disabledList = [] // disabled 为true组成的数组
    this.checkedKeys = [] // 选中的 ids
    this.checkedNodes = [] // 选中的 nodes
    this.allCheckedList = [] // 所有选中的节点， 用于开启开关 isOnlyInCheckedSearch 时， 仅在选中节点里筛选。
  }
}

// TODO: 添加自定义深拷贝方法
export function cloneDeep(value) {

}

/**
 * 自己 || 子 || 孙 是否含有关键字
 * @param {Object} node 当前节点
 * @param {String} keyword
 * @param {Array} list
 * @returns {Boolean}
 */
export function isIncludesKeyword(node, keyword, list) {
  const keywords = keyword.split(/[,，]/).filter(v => v)
  // const isInclude = node.label.includes(keyword);
  const isInclude = keywords.some(keyword => node.label.includes(keyword))
  if (isInclude) {
    // 自己匹配上了
    return true
  }
  // if (!node.isLeaf) {
  if (node.isLeaf === false) {
    const allDirectChildren = list.filter(i => i.parentId === node.id)
    return allDirectChildren.some(i => isIncludesKeyword(i, keyword, list))
  }
  return false
}

/**
 * 自己 || 子 || 孙 是否选中
 * @param {Object} node 节点
 * @param {Array} list
 */
export function isCheckedOrIndeterminate(node, list) {
  const is = node.checked || node.indeterminate
  if (is) {
    // 自己匹配上了
    return true
  }
  // if (!node.isLeaf) {
  if (node.isLeaf === false) {
    const allDirectChildren = list.filter(i => i.parentId === node.id)
    return allDirectChildren.some(i => isCheckedOrIndeterminate(i, list))
  }
  return false
}

/**
 * 广度优先遍历算法，找子树, 不包含自己
 * @param {Array} trees 原始树，数组
 * @param {Number|String} rootId 子树根结点
 * @return {Object} 子树
 */
export function findSubTree(tree, rootId) {
  if (!Array.isArray(tree)) {
    console.warn('The parameter tree to function breadthFirstEach must be an array')
    return
  }
  if (!tree || tree.length === 0) return []
  const item = tree.find(node => node.id === rootId)
  if (item) return item.children || []
  const childrenList = tree
    .filter(node => node.children)
    .map(i => i.children)
    .flat(1)
  return findSubTree(childrenList, rootId)
}

/**
 * 深度优先遍历算法, 遍历tree的每一项
 * @param {Object} {tree, path: 父节点的path, init: 是否是初始化}
 * @param {Callback}} cb 回调函数，参数为 node
 */
export function depthFirstEach({ nodeKey = 'id', tree, path = [], lazy = false, level = undefined, props = undefined, init = false, parentId = undefined }, cb) {
  if (!Array.isArray(tree)) {
    console.warn('The tree in the first argument to function depthFirstEach must be an array', typeof tree)
    return
  }
  if (init === true && (level === undefined || props === undefined)) {
    console.error('初始化时, 缺少必填项: `level`, `props`')
    return
  }

  if (!tree || tree.length === 0) return
  const getNextLevel = (level != null && level != undefined) ? level + 1 : undefined
  for (let i = 0, len = tree.length; i < len; i++) {
    /* ** */
    const _node = tree[i]
    let node = _node

    const hasChildren = node.children && node.children.length > 0
    // 初始化
    if (init) {
      /* 
        1. _node表示data
        2. 生成node结构
      */
      node = {
        id: _node[nodeKey],
        parentId: node.parentId || parentId,
        label: _node[props.label],
        data: _node,
        level: level,
        path: [...path, node.id]
      }
      // node.data = JSON.parse(JSON.stringify(node))
      // node.level = level
      // node.label = node.data[props.label]
      // node.id = node.data[nodeKey]
      // node.path = [...path, node.id]
      // node.parentId = node.parentId || parentId

      /*
        如果开启了懒加载, 并且没有children, 则设置isLeaf为未知
        没有子节点为true
      */
      node.isLeaf = (lazy && !hasChildren) ? undefined : !hasChildren // node.isLeaf == undefined ? !hasChildren : node.isLeaf
    }
    if (cb) {
      const res = cb(node)
      if (res === 'break') return
    }
    if (hasChildren) {
      depthFirstEach({ tree: init ? node.data.children : node.children, path: node.path, init, lazy, level: getNextLevel, props, parentId: node[nodeKey] }, cb)
    }
  }
}
/**
 * 获取后代 叶子节点的数量
 * @param {Object} node
 * @param {Array} tree
 * @returns {Number}
 */
export function getLeafCount(tree, node) {
  const subTree = findSubTree(tree, node.id)
  let count = 0
  depthFirstEach({ tree: subTree }, (node) => {
    if (node.isLeaf) {
      count++
    }
  })
  return count
}
/**
 * @see getLeafCount()
 * @param {*} tree 
 * @param {*} node 
 * @returns 
 */
export function getSubNodeCount(tree, node) {
  const subTree = findSubTree(tree, node.id)
  let count = 0
  depthFirstEach({ tree: subTree }, (node) => {
    count++
  })
  return count
}


export function listToTree(filterList) {
  if (!Array.isArray(filterList)) {
    console.warn('The parameter filterList to function listToTree must be an array')
    return
  }
  if (!filterList || filterList.length === 0) return []
  const root = {
    // 0: {
    //   id: 0,
    //   lalbel: '333',
    //   childrenMap: {
    //     1: {id: 1, label: '', childrenMap: {}},
    //     2: {}
    //   }
    // },
  }
  // 定义查找父节点的函数，根据 path
  const parentNode = (root, path) => {
    const _path = path.slice()
    const rootId = _path.shift()
    if (_path.length > 1) {
      return parentNode(root[rootId].childrenMap, _path)
    }
    if (_path.length === 1) {
      return root[rootId].childrenMap
    }
    return root
  }
  // 设置filter后的 children
  const setChildren = (root) => {
    const nodes = Object.values(root)
    for (const node of nodes) {
      node.children = Object.values(node.childrenMap)
      if (node.children && node.children.length > 0) {
        setChildren(node.childrenMap)
      }
    }
  }

  filterList.forEach(node => {
    node.childrenMap = {}
    parentNode(root, node.path)[node.id] = node
  })
  setChildren(root)
  return Object.values(root)
}

/**
 * 广度优先遍历算法，
 * @param {Object} {tree, limitDeep: 限制遍历的深度， deep: 当前深度}
 * @param {Callback} cb
 */
export function breadthFirstEach({ tree, limitDeep = Number.MAX_SAFE_INTEGER, deep = 0 }, cb) {
  if (!Array.isArray(tree)) {
    console.warn('The tree in the first argument to function breadthFirstEach must be an array')
    return
  }
  if (!tree || tree.length === 0) return
  tree.forEach(node => {
    if (cb) cb(node)
  })
  const childrenList = tree
    .filter(node => node.children)
    .map(i => i.children)
    .flat(1)
  breadthFirstEach({ tree: childrenList, limitDeep, deep: deep++ }, cb)
}


/**
 * 广度优先遍历算法，节点自己
 * @param {Array} trees 原始树，数组
 * @param {Number|String} rootId 自身id
 * @return {Object} node
 */
export function findNode(tree, rootId) {
  if (!Array.isArray(tree)) {
    console.warn('The parameter tree to function findNode must be an array')
    return
  }
  if (!tree || tree.length === 0) return {}
  const item = tree.find(node => node.id === rootId)
  if (item) return item
  const childrenList = tree
    .filter(node => node.children)
    .map(i => i.children)
    .flat(1)
  return findNode(childrenList, rootId)
}

/**
 * 判断节点是否是亲兄弟
 * @param {Object} node1
 * @param {Object} node2
 */
export function isBrother(node1, node2) {
  if (!node1 || !node2) return false
  const p1 = String(node1.path.slice(0, -1))
  const p2 = String(node2.path.slice(0, -1))
  return p1 === p2
}
