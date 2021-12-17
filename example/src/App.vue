<template>
  <div class="huge-demo">
    <!-- <router-link :to="'/demo/hugeTree1'">hugeTree1</router-link>
    <button @click="nav">hugeTree1</button> -->
    <div class="btn-bar">
      tree<br />
      点击按钮，展示tree<br />
      <button @click="btnClick('tree-10')">10条</button>
      <button @click="btnClick('tree-500')">500条</button>
      <button @click="btnClick('tree-10000')">1w 条</button>
      <button @click="btnClick('tree-20000')">2w 条</button>
      <button @click="btnClick('tree-30000-multi-disabled')">3w 条(含有大量 disabled)</button>
      <button @click="btnClick('tree-50000')">5w 条</button>
      <button @click="btnClick('tree-100000')">10w 条</button>
      <button @click="btnClick('tree-200000')">20w 条</button><br />
      <button @click="onReload">刷新</button>
      <button @click="invokeRef('showCheckedOnly')">
        showCheckedOnly
      </button>
    </div>

    <div class="tree-wrap" v-show="isShowDialog">
      <huge-tree
        ref="huge-tree"
        checkedAction="dblclick"
        node-key="id"
        :expandKeys="expandKeys"
        :expandLevel="1"
        :isLoading="isLoading"
        :defaultCheckedKeys="checkedKeys"
        @onChange="onChange"
        @onClickLabel="onClickLabel"
        @node-click="onNodeClick"
        @node-contextmenu="onNodeMenuClick"
        @onClickCheckbox="onClickCheckbox"
      >
        <select slot="pre-input" class="pre-select">
          <option value="1">slot</option>
          <option value="2">hhh</option>
        </select>
        <span slot-scope="{ data, node }"><i>&#9733;</i> 
          {{ node.label }}
          {{ data.leaf }}
        </span>
        <i slot="loading">加载中...</i>
      </huge-tree>
    </div>

    <!-- 懒加载 -->
    <div style="margin-top:100px;height: 600px; width: 400px;">
      <button @click="onLazy('tree-load-1')">懒加载</button><br />
      <huge-tree
        ref="lazy-tree"
        checkedAction="dblclick"
        node-key="id"
        lazy
        :load="loadSubNode"
        :expandKeys="expandKeys"
        :expandLevel="1"
        :isLoading="isLoading"
        :defaultCheckedKeys="checkedKeys"
        @onChange="onChange"
        @node-check="onClickLabel"
        @onClickCheckbox="onClickCheckbox"
      >
        <select slot="pre-input" class="pre-select">
          <option value="1">slot</option>
          <option value="2">hhh</option>
        </select>
        <span slot-scope="{ data, node }"><i>&#9733;</i> 
          {{ node.label }}
          {{ data.leaf }}
        </span>
        <i slot="loading">加载中...</i>
      </huge-tree>
    </div>

    <read-me style="margin-top: 100px;" class="mark-down"></read-me>

    <vue-context-menu class="right-menu"
            ref="rightMenu"
            :target="contextMenuTarget"
            :show="contextMenuVisible"
            @update:show="onRightHandle">
              <a class="menu-item" href="javascript:void(0);" @click="menuClickHandle('ddl')">
                查看创建语句
              </a>
              <a class="menu-item" href="javascript:void(0);" @click="menuClickHandle('copy_name')">
                复制名称
              </a>
              <a class="menu-item" href="javascript:void(0);" @click="menuClickHandle('refresh')">
                刷新
              </a>
        </vue-context-menu>
  </div>
</template>

<script>
import random from '@shuaninfo/random'
import axios from 'axios';
import Tree from '@shuaninfo/tree'
import ReadMe from '../readme.md'
// 右键
import { component as VueContextMenu } from '@shuaninfo/vue-context-menu'
export default {
  components: {
    HugeTree:Tree,
    ReadMe,
    VueContextMenu
  },
  props: {},
  data() {
    return {
      currentMenuNode: null,
      checkedKeys: [],
      isLoading: true,
      isShowDialog: false,
      expandKeys: [],
      // 右键
      contextMenuTarget: null, // 范围
      contextMenuVisible: false // 菜单是否显示
    };
  },
  mounted() {
    // this.btnClick('tree-10');
    this.onLazy('tree-load-1')
  },
  methods: {
    nav() {
      // this.$router.replace('/demo/hugeTree1');
    },
    menuClickHandle(key){
      console.log(key, this.currentMenuNode && this.currentMenuNode.label)
      this.contextMenuVisible = false
    },
    onRightHandle (e) {
      this.contextMenuVisible = e
      // (show) => contextMenuVisible = show
    },
    // 懒加载
    onLazy(jsonFileName){
      // this.invokeRef('clear')
      this.isShowDialog = true;
      axios.get(`/static/json/${jsonFileName}.json`).then(({data})=>{
        this.expandKeys = [];
        this.$nextTick(()=>{
          this.$refs['lazy-tree'].setData(data)
          this.isLoading = false;
        })
      })
    },
    loadSubNode(node, resolve){
      axios.get(`/static/json/tree-load-${node.level+1}.json`).then(({ data }) => {
        data.forEach(item => {
          item.id = `${item.id}_${random({length: 10})}`
        })
        resolve(data)
      })
    },
    btnClick(jsonFileName) {
      this.isShowDialog = true;
      axios.get(`/static/json/${jsonFileName}.json`).then(({ data }) => {
        this.expandKeys = ['1-1', '2-1'];
        this.$refs['huge-tree'].setData(data);
        this.isLoading = false;
        setTimeout(() => {
          // this.checkedKeys = ['2-1'];
          // this.$refs['huge-tree'].setCheckedKeys(['1-3', '1-5']);
        }, 1000);
      });
    },
    onChange({ checkedKeys, checkedNodes }) {
      console.log('onChange', checkedKeys, checkedNodes);
    },
    onClickLabel(node) {
      console.log('onClickLabel', node);
    },
    onNodeClick(data, node, e){
      console.log('onNodeClick: ', data, node, e)
    },
    onNodeMenuClick(e, _, node){
      this.$refs['huge-tree'].setSelectNode(node.id)
      // console.log('onNodeMenuClick: ', data, node, e)
      // 打开右键
      this.currentMenuNode = node
      this.$refs.rightMenu.contextMenuHandler(e)
    },
    onClickCheckbox(node) {
      console.log('onClickCheckbox', node);
    },
    onReload() {
      window.location.reload();
    },
    invokeRef(name) {
      this.$refs['huge-tree'][name]();
    },
  },
};
</script>
<style lang="scss">
  .right-menu {
      min-width: 100px;
      position: fixed;
      z-index: 999;

      display: none;

      border: solid 1px rgba(0, 0, 0, .2);
      border-radius: 3px;
      background: #fff;
  }
  .right-menu{
    padding: 5px;
  }
  .right-menu a {
      line-height: 28px;

      display: block;

      // width: 75px;
      height: 28px;
      padding-left: 8px;
      text-align: left;

      color: #1a1a1a;
  }

  .right-menu a:hover {
      opacity: .6;
  }
</style>
<style scoped lang="scss" style="text/scss">
.huge-demo {
  text-align: left;
  .btn-bar {
    padding: 20px;
    button {
      cursor: pointer;
      padding: 5px 10px;
      color: #ffffff;
      background-color: #409eff;
      border-radius: 4px;
      &:hover {
        background-color: #228af1;
      }
    }
  }
  .tree-wrap {
    height: 600px;
    width: 400px;
    .pre-select {
      cursor: pointer;
      padding: 5px 10px;
    }
  }
}
</style>
