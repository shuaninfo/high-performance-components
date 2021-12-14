<template>
  <!-- shuan high performance-component -->
  <div class="sahpc-tree">
    <!-- <section v-if="hasInput" class="search-bar">
      <slot name="pre-input"></slot>
      <div class="input">
        <input
          v-model="keyword"
          type="text"
          class="filter-input"
          :placeholder="placeholder"
          @keyup.13="init"
          @input="debounceInput"
        />
        <i v-if="keyword" class="clear-input" @click="init(keyword)"></i>
      </div>
      <button class="search-btn" @click="init">搜索</button>
    </section> -->
    <section ref="content-wrap" class="content-wrap" @scroll="onScroll">
      <div class="tree-phantom" :style="`height: ${phantomHeight}px`"></div>
      <div
        class="tree-content"
        :style="`transform: translateY(${startIndex * itemHeigth}px)`"
      >
        <template v-for="(item, index) in renderList">
          <section
            v-if="item.path"
            :key="'k' + index"
            :class="['item', { 'is-hidden': item.isHidden }]"
            :style="`margin-left: ${(item.path.length - 1) * Number(indent)}px`"
          >

            <div
              v-if="item.isLeaf !== true"
              class="node-expand-btn"
              :class="[
                item.isLeaf===true ? 'leaf-node' : 'expand-node',
                { 'is-expand': item.isExpand ===true }
              ]"
              @click="onExpand(item, index)"
            ></div>
            <div v-else class="node-expand-btn"></div>

            <dt-checkbox
              v-model="item.checked"
              :indeterminate="item.indeterminate"
              :disabled="item.disabled"
              :is-leaf="item.isLeaf===true"
              :show-checkbox-leaf-only="showCheckboxLeafOnly"
              :checked-action="checkedAction"
              :show-checkbox="showCheckbox"
              :check-striclty="checkStriclty"
              :node="item"
              :class="{ 'is-disabled': item.disabled }"
              @on-checked="onChecked(item, index)"
              @on-click-label="$emit('onClickLabel', item)"
            >
              <div class="label">
                <slot :slot-scope="item">
                  {{ item.label  }}
                </slot>
                <!-- 不是叶子: 显示子/孙节点数量 -->
                <!-- <i v-if="item.isLeaf === false" class="count">
                  ({{ item.subNodeCount }})
                </i> -->
              </div>
            </dt-checkbox>
          </section>
        </template>
      </div>
    </section>
    <section v-if="renderList.length <= 0" class="no-data">
      <p v-if="isLoading || isSearching">
        <slot name="loading">loading...</slot>
      </p>
      <p v-else>{{ emptyText }}</p>
    </section>
  </div>
</template>
<script>
import Checkbox from './checkbox.vue'
import { throttle, debounce, clearAll } from './utils/index.js'
import {
  isIncludesKeyword,
  getSubNodeCount,
  depthFirstEach,
  listToTree,
  findSubTree,
  breadthFirstEach,
  findNode,
  isBrother,
  isCheckedOrIndeterminate,
  BigData
} from './util.js'

export default {
  name: 'Tree',
  components: {
    'dt-checkbox': Checkbox
  },
  props: {
    // 节点唯一ID
    nodeKey: { required: true, type: String, default: 'id' },

    // 懒加载
    lazy:{type: Boolean, default: false},
    load:{type: Function, default:(node, resolve)=>{}},
    props:{
      typep: Object,
      default: ()=>{
        return {
          children: 'children',
          label: 'label',
          isLeaf: 'leaf'
        }
      }
    },
    // 含有过滤输入框
    hasInput: { type: Boolean, default: false },
    // 缩进
    indent: { type: [String, Number], default: 15 },
    // 指定ids展开
    expandKeys: {
      type: Array,
      default: () => {
        return []
      }
    },
    // 展开 level， all: 展开全部； 1: 只展示第一层(最外层)；2: 展示到第二层；、、、
    expandLevel: { type: [String, Number], default: 1 },
    // 输入框 placeholder
    placeholder: {
      type: String,
      default: '请输入关键字进行查找,支持逗号分隔多匹配'
    },
    // isLoading
    isLoading: { type: Boolean, default: false },
    // 在 label 上选中动作， 点击label选中 --> none: 不选中；click: 单击； dblclick: 双击；
    checkedAction: { type: String, default: 'none' },
    // 内容为空展示的文本
    emptyText: { type: String, default: '暂无数据' },
    // 是否展示checkbox
    showCheckbox: { type: Boolean, default: false },
    // showCheckboxLeafOnly
    showCheckboxLeafOnly: { type: Boolean, default: false },
    // 默认勾选值
    defaultCheckedKeys: { type: Array, default: () => [] },
    // 父子不互相关联
    checkStriclty: { type: Boolean, default: false }
  },
  computed: {
    // 过滤掉 hidden 节点
    unHiddenList() {
      return this.updateViewCount ? this.big.filterList.filter(i => !i.isHidden) : []
    },
    // 虚拟高度，与隐藏的数量有关
    phantomHeight() {
      return this.unHiddenList.length * this.itemHeigth
    },
    renderList() {
      return this.unHiddenList.slice(this.startIndex, this.endIndex)
    }
  },
  watch: {
    // 选中的
    defaultCheckedKeys(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.setCheckedKeys(newVal)
      }
    },
    // 展开的
    expandKeys(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.setExpand(newVal)
      }
    }
  },
  data() {
    this.big = null
    return {
      updateViewCount: 1, // 用于视图更新
      keyword: '', // 关键词
      isSearching: false, // 搜索中
      itemHeigth: 27, // 每一项的高度
      startIndex: 0, // 渲染的开始区间
      endIndex: 70, // 渲染的结束区间
      throttleSrcoll: '', // 节流
      debounceInput: '',
      isOnlyInCheckedSearch: false
    }
  },
  methods: {
    // 设置海量数据
    setData(data) {
      this.clear()
      this.big._data = data
      this.init('init')
    },
    init(op, { lazy = false, node = null }={}) {
      // op: init, restore, showCheckedOnly
      if (this.big._data.length === 0) return
      if (op === 'init') {
        // 拉平tree, 填充到this.big.list

        // data => node<{id, label, data..}>
        this.data2node(this.big._data)

        const _list = this.big.list
        const _listMap = this.big.listMap
        for(let i=0,len=_list.length;i<len;i++){
          const node = _list[i]
          _listMap[node.id] = node
        }
      }else if(op === 'lazy'){
        // 懒加载
        this.data2node(this.big._loadData, {lazy})
        const _list = this.big.lazylist
        const _listMap = this.big.listMap
        for(let i=0,len=_list.length;i<len;i++){
          const node = _list[i]
          _listMap[node.id] = node
        }
      }
      this.initFilter(op, {lazy, node})
      if (op === 'init' || op === 'restore') this.initExpand()
      this.setCheckedKeys(this.big.checkedKeys)
      this.backToTop()
      console.log('初始化结束: ', this.big)
    },
    // 拉平 tree
    data2node(datas, {lazy=false}={}) {
      // level从1开始
      const _list = lazy ? this.big.lazylist : this.big.list
      depthFirstEach({ tree: datas, nodeKey: this.nodeKey, lazy:true, init: true, props: this.props,  level: 1 }, node => {
        _list.push(node)
      })
    },

    // 初始化处理展开逻辑
    initExpand() {
      if (!this.big || this.big._data.length === 0) return
      // expandKeys 处理
      if (this.expandKeys.length > 0) {
        this.setExpand(this.expandKeys)
        return
      }
      // expandLevel 处理
      if (/^\d+$/.test(this.expandLevel)) {
        this.big.filterList.forEach(node => {
          node.isExpand = Boolean(node.path.length < this.expandLevel)
          node.isHidden = Boolean(node.path.length > this.expandLevel)
          // if(node.id.indexOf('table_')===0){
          //   debugger
          // }
          this.initNode(node)
        })
      } else {
        // 展开全部
        this.big.filterList.forEach(node => {
          node.isExpand = true
          node.isHidden = false
          this.initNode(node)
        })
      }
      this.updateView()
    },

    // 指定id展开
    setExpand(keys = []) {
      if (keys.length <= 0) return
      if (!this.big || this.big._data.length === 0) return
      const nodes = keys.map(id => this.big.listMap[id]).filter(v => v)
      const expandIds = Array.from(new Set(nodes.map(node => node.path).flat(1)))
      
      const _filterList = this.big.filterList
      for(let i=0,len=_filterList.length; i < len; i++){
        const node = _filterList[i]
        // TODO: 考虑懒加载时, 
        // if (node.isLeaf === true || node.isLeaf === undefined) {
        if (node.isLeaf === true) {
          // 是叶子
          node.isExpand = false
          node.isHidden = Boolean(!expandIds.includes(node.parentId))
        } else {
          // 不是树叶
          node.isExpand = Boolean(expandIds.includes(node.id))
          node.isHidden = !node.isExpand && Boolean(!expandIds.includes(node.parentId))
        }
        this.initNode(node)
      }
      this.updateView()
    },

    // 初始化节点所需要的字段
    initNode(node) {
      node.checked = node.checked || false
      node.indeterminate = node.indeterminate || false
      node.disabled = node.disabled || false
    },

    // 回显选中状态
    setCheckedKeys(keys = []) {
      if (!Array.isArray(keys)) {
        console.warn('The argument to function setCheckedKeys must be an array')
        return
      }
      this.clearChecked()
      const nodes = keys.map(id => this.big.listMap[id])
      nodes.forEach((node, index) => {
        // if (node && node.isLeaf) {
        if (node) {
          node.checked = true
          if (!isBrother(node, nodes[index + 1])) {
            this.handleCheckedChange(node)
          }
        }
      })
      this.emitChecked()
    },

    // 回显选中状态
    setCheckedNodes(nodes = []) {
      if (!Array.isArray(nodes)) {
        console.warn(
          'The argument to function setCheckedNodes must be an array'
        )
        return
      }
      if (nodes.length > 0) {
        const keys = nodes.map(i => i.id)
        this.setCheckedKeys(keys)
      }
    },

    // 获取选中状态
    getCheckedKeys() {
      return this.big.checkedKeys
    },
    getCheckedNodes() {
      return this.big.checkedNodes
    },
    /**
     * 当lazy为true时, 懒加载
     * @param {Node} node 当前展开的node
     * @param {Array<NodeData>} datas 待加载的数据列表
     */
    loadNode(node){
      if(this.lazy && this.load){
        const loadFn = this.load
        loadFn(node, (datas) => {
          // TODO: 懒加载, 加入this.big._data中
          // 设置node为展开状态
          node.isExpand = !node.isExpand
          this.big._loadData = datas
          this.init('lazy', {lazy:true, node})
          this.updateView()
          console.log('懒加载: ', this.big)
        })
      }else{
        console.error('懒加载配置错误!')
      }
    },
    // 点击展开与收缩
    onExpand(node) {
      /*
        1. 如果是叶子, 则不处理
        2. 如果不是叶子 & 开启了懒加载
        3. 如果不是叶子 & 关闭了懒加载
      */
     if (node.isLeaf === true || node.isLeaf ===  undefined) return
      if(node.isLeaf === false && this.lazy === true){
        this.loadNode(node)
        // 调用
        return
      }
      node.isExpand = !node.isExpand
      this.showOrHiddenChildren(node, !node.isExpand)
    },
    // 点击checkbox
    onChecked(node) {
      // node.checked = true
      this.handleCheckedChange(node)
      this.emitChecked()
      this.$emit('onClickCheckbox', node)
    },

    // 发送给父组件选中信息
    emitChecked() {
      this.big.checkedNodes = this.big.list.filter(
        i => i.checked || i.indeterminate
      ) // 返回”所有“选中的节点 或者 父节点(子节点部分选中)
      this.big.checkedKeys = this.big.checkedNodes.map(i => i.id)
      this.$emit('onChange', {
        checkedKeys: this.big.checkedKeys,
        checkedNodes: this.big.checkedNodes
      })
      this.updateView()
    },
    // 处理选中逻辑
    handleCheckedChange(node) {
      // 父子不互相关联
      if (this.checkStriclty) {
        node.indeterminate = node.isLeaf ? false : node.checked
        return
      }
      if (node.checked) node.indeterminate = false
      this.doChildrenChecked(node)
      this.doParentChecked(node.parentId)
      this.big.disabledList.forEach((node, index) => {
        if (!isBrother(node, this.big.disabledList[index + 1]))
          this.doParentChecked(node.parentId)
      })
    },

    // 1. 隐藏： 子孙后代都要隐藏， 2. 展开：仅儿子展开, value
    showOrHiddenChildren(node, isHidden) {
      if (isHidden) {
        depthFirstEach({ tree: node.children }, snode => {
          snode.isHidden = isHidden
          snode.isExpand = false
        })
      } else {
        node.children.forEach(j => {
          j.isHidden = isHidden
          j.isExpand = false
        })
      }
      this.updateView()
    },

    /**
     * 处理子、孙后代
     * @param {Node} 当前节点
     */
    doChildrenChecked(node) {
      if (!node.children) return
      const checked = node.checked
      depthFirstEach({ tree: node.children }, snode => {
        // if ((snode.isLeaf === true || snode.isLeaf === undefined) && snode.disabled) return
        if ((snode.isLeaf === true) && snode.disabled) return
        snode.indeterminate = false
        snode.checked = checked
      })
    },

    /**
     * 处理自己及祖先
     * @param {String} 上级ID
     */
    doParentChecked(parentId) {
      if (parentId === null || parentId === undefined) return
      const allDirectChildren = findSubTree(this.big.filterTree, parentId)
      const parentNode = findNode(this.big.filterTree, parentId)
      const childrenAllChecked = allDirectChildren.every(i => i.checked)
      this.checkParentIndeterminate(parentNode, allDirectChildren)
      parentNode.checked = childrenAllChecked
      if (childrenAllChecked) parentNode.indeterminate = false
      if (parentNode.parentId !== null)
        this.doParentChecked(parentNode.parentId)
    },

    // 子元素部分选中，核对祖先是否部分选中
    checkParentIndeterminate(parentNode, directChildren) {
      const hasChecked = directChildren.some(i => i.checked)
      const hasUnchecked = directChildren.some(i => !i.checked)
      const partOfChecked = hasChecked && hasUnchecked
      const childrenHasIndeterminate = directChildren.some(i => i.indeterminate)
      const isIndeterminate = partOfChecked || childrenHasIndeterminate
      parentNode.indeterminate = !!isIndeterminate
      directChildren.forEach(node => {
        if (node.checked) node.indeterminate = false
      })
    },

    // 监听滚动
    onScroll() {
      this.throttleSrcoll()
    },

    // 设置可见区域的区间
    setRenderRange(scrollTop = this.$refs['content-wrap'].scrollTop) {
      const count = Math.ceil(this.$el.clientHeight / this.itemHeigth) + 40 // 可见项数
      const startIndex = Math.floor(scrollTop / this.itemHeigth)
      this.startIndex = startIndex > 20 ? startIndex - 20 : 0
      this.endIndex = this.startIndex + count
      this.updateView()
    },

    // 筛选节点
    initFilter(op, {lazy = false, node = null}={}) {
      // set this.big.filterList
      this.setFilterList(op)
      this.updateView()
      // 过滤后的tree  同时也将children挂载到了this.filterList的节点
      this.big.filterTree = listToTree(this.big.filterList)
      // TODO: 根据配置确定是否查询
      // breadthFirstEach({ tree: this.big.filterTree }, node => {
      //   /* false: 不是叶子; true: 叶子; undefined: 未知 */
      //   if (node.isLeaf === false) {
      //     // 子/孙节点数量
      //     node.subNodeCount = getSubNodeCount(this.big.filterTree, node)
      //   }
      // })
      this.big.disabledList = this.big.filterList.filter(i => i.disabled)
    },

    // set this.big.filterList
    setFilterList(op) {
      if (op === 'showCheckedOnly') {
        // 不直接 this.big.filterList = this.big.checkedNodes, 因为之前的 filter 将 滤掉的 非叶子节点indeterminate = true 丢失了。场景，1. 输入关键字，2. 点击showCheckedOnly
        this.big.filterList = this.big.list.filter(i => {
          const is = isCheckedOrIndeterminate(i, this.big.list)
          if (is) {
            i.checked = true
            i.indeterminate = false
          }
          return is
        })
        return
      }
      if (this.isOnlyInCheckedSearch && this.big.allCheckedList.length > 0) {
        if (this.keyword.trim() === '') {
          this.big.filterList = this.big.allCheckedList
          return
        }
        this.big.filterList = this.big.allCheckedList.filter(i => {
          return isIncludesKeyword(i, this.keyword, this.big.allCheckedList)
        })
        return
      }
      if (this.keyword.trim() === '') {
        this.big.filterList = this.big.list
        return
      }
      this.big.filterList = this.big.list.filter(i => {
        return isIncludesKeyword(i, this.keyword, this.big.list)
      })
    },

    // 回到顶部
    backToTop() {
      this.$nextTick(() => {
        this.$refs['content-wrap'].scrollTop = 0
        this.setRenderRange()
      })
    },

    // 清空所有选中
    clearChecked() {
      this.big.list.forEach(node => {
        node.checked = false
        node.indeterminate = false
      })
    },

    /**
     * 根据 updateViewCount 手动触发 computed
     */
    updateView() {
      this.updateViewCount++
    },

    // 仅展示选中的项
    showCheckedOnly(isOnlyInCheckedSearch = true) {
      this.keyword = ''
      this.init('showCheckedOnly')
      // 开关，仅在选中节点里筛选
      this.isOnlyInCheckedSearch = isOnlyInCheckedSearch
      if (isOnlyInCheckedSearch) {
        this.big.allCheckedList = this.big.checkedNodes.slice()
      } else {
        this.big.allCheckedList = []
      }
    },

    restore() {
      this.isOnlyInCheckedSearch = false
      this.big.allCheckedList = []
      this.init('restore')
    },
    // 手动更新选中状态
    update() {
      this.updateView()
    },

    // 清空内存占用
    clear() {
      this.updateViewCount = 1
      this.keyword = '' // 关键词
      this.isSearching = false // 搜索中
      this.startIndex = 0 // 渲染的开始区间
      this.endIndex = 70 // 渲染的结束区间
      this.isOnlyInCheckedSearch = false
      clearAll(this.big.list)
      if (this.big) {
        this.big._data = [] // 海量数据 tree
        this.big.list = [] // 扁平化的tree
        this.big.filterList = [] // 根据关键词过滤后的list
        this.big.listMap = {} // this.big.filterList 对应的 map
        this.big.filterTree = [] // 根据关键词过滤后的tree
        this.big.disabledList = [] // disabled 为true组成的数组
        this.big.checkedKeys = [] // 选中的 ids
        this.big.checkedNodes = [] // 选中的 nodes
      }
    }
  },
  created() {
    this.big = new BigData()
    this.big.checkedKeys = JSON.parse(JSON.stringify(this.defaultCheckedKeys))
    this.throttleSrcoll = throttle(this.setRenderRange, 80)
    this.debounceInput = debounce(this.init, 300)
  },
  beforeDestroy() {
    this.clear()
  }
}
</script>
<style lang="scss">
.sahpc-tree {
  border: 1px solid #000;
  padding: 10px 0;
  min-height: 50px;
  height: 100%;
  display: flex;
  flex-direction: column;
  .search-bar {
    padding: 0 10px 10px 10px;
    display: flex;
    .input {
      flex: 1;
      position: relative;
      .filter-input {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #dcdfe6;
        border-right: none;
        padding: 8px 10px;
        &:focus {
          outline: none;
          border-color: #409eff;
        }
      }
      .clear-input {
        position: absolute;
        border-radius: 50%;
        font-style: normal;
        width: 12px;
        top: 10px;
        height: 12px;
        right: 6px;
        border: 1px solid #cccccc;
        color: #ccc;
        display: inline-block;
        cursor: pointer;
        &::after {
          content: '\00D7';
          position: absolute;
          top: -6px;
          left: 1px;
          transform: scale(0.7);
        }
        &:hover {
          border-color: #409eff;
          color: #409eff;
        }
      }
    }
    .search-btn {
      width: 50px;
      background-color: #409eff;
      color: #ffffff;
      border: none;
      cursor: pointer;
      &:hover {
        background-color: #228af1;
      }
    }
  }
  .content-wrap {
    position: relative;
    overflow: auto;
    padding: 0 10px;
    flex: 1;
    .tree-phantom {
      position: absolute;
      left: 0;
      top: 0;
      right: 0;
      z-index: -1;
    }
    .tree-content {
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      .item {
        display: flex;
        align-items: center;
        padding: 2px 18px 2px 15px;
        &:hover {
          background-color: #f9fafc;
        }
        &.is-hidden {
          display: none;
          // visibility: hidden;
        }
        .node-expand-btn{
          position: relative;
          right: 4px;
          width: 10px;
          height: 10px;
          line-height: 10px;
        }
        .expand-node {
          // border: 1px solid #4a4a4a;
          transition: transform 0.3s ease-in-out;
          cursor: pointer;
          &.is-expand {
            transform: rotate(180deg);
          }
          &:hover {
            color: #409eff;
            border-color: #409eff;
            background-color: #f1f5f8;
          }
          &::before {
            content: '+';
            position: absolute;
            top: -1px;
            left: 0;
            transform: scale(0.8);
          }
          // 展开
          &.is-expand::before {
            content: '-';
            top: -2px;
            left: 0px;
          }
        }
        .label {
          cursor: pointer;
          &:hover {
            color: #409eff;
          }
          .count {
            font-size: 12px;
          }
        }
        .is-disabled {
          cursor: not-allowed;
          pointer-events: none;
          .label {
            color: #aaaaaa;
          }
        }
      }
    }
  }
  .no-data {
    text-align: center;
  }
}
</style>
