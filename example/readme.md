

#  @shuaninfo/tree

> 修改foreach



```html
<tree
ref="treeRef"
      :class="{'card-db-item-tempalte-disabled':  isDisabled,'card-db-item-tempalte-selected': isCurrentTree || isRootTree}"
      :expand-on-click-node="false"
      :props="defaultProps"
      :load="loadSubNode"
      :default-expand-all="false"
      node-key="_uniKey"
      lazy
      @node-collapse="closeNodeHandle"
      @node-click="onItemClick"
      @node-contextmenu="onMenuClick"

slot-scope="{ data, node }"


<!--  -->
<btm-huge-tree
        ref="huge-tree"
        hasInput
        checkedAction="dblclick"
        :expandKeys="expandKeys"
        expandLevel="all"
        :isLoading="isLoading"
        :showCheckbox="true"
        :defaultCheckedKeys="checkedKeys"
        @onChange="onChange"
        @onClickLabel="onClickLabel"
        @onClickCheckbox="onClickCheckbox"


               
               
@node-click="onItemClick"
@node-contextmenu="onMenuClick"
lazy
node-key="_uniKey"
:expand-on-click-node="false"
:props="defaultProps"
:load="loadSubNode"
:default-expand-all="false"
               
```



### Attributes

| 参数                 | 说明                                                         | 类型                    | 可选值 | 默认值 |
| -------------------- | ------------------------------------------------------------ | ----------------------- | ------ | ------ |
| empty-text           | 内容为空的时候展示的文本                                     | String                  |        |        |
| node-key             | 每个树节点用来作为唯一标识的属性，整棵树应该是唯一的         |                         |        |        |
| props                | 配置选项，具体看下表                                         | object                  |        |        |
| lazy                 |                                                              |                         |        |        |
| load                 | 加载子树数据的方法，仅当 lazy 属性为true 时生效              | function(node, resolve) |        |        |
| highlight-current    | 是否高亮当前选中节点，默认值是 false。                       | boolean                 | -      | false  |
| expand-on-click-node | 是否在点击节点的时候展开或者收缩节点， 默认值为 true，如果为 false，则只有点箭头图标的时候才会展开或者收缩节点。 | boolean                 |        | true   |
| auto-expand-parent   | 展开子节点的时候是否自动展开父节点                           | boolean                 | -      | true   |
| show-checkbox        | 节点是否可被选择                                             | boolean                 | -      | false  |

#### props

| 参数     | 说明                                                     | 类型                          | 可选值 | 默认值 |
| -------- | -------------------------------------------------------- | ----------------------------- | ------ | ------ |
| label    | 指定节点标签为节点对象的某个属性值                       | string, function(data, node)  | -      | -      |
| children | 指定子树为节点对象的某个属性值                           | string                        | -      | -      |
| disabled | 指定节点选择框是否禁用为节点对象的某个属性值             | boolean, function(data, node) | -      | -      |
| isLeaf   | 指定节点是否为叶子节点，仅在指定了 lazy 属性的情况下生效 | boolean, function(data, node) | -      | -      |



### 方法

| 方法名             | 说明                                                         | 参数                                                         |
| ------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| setCurrentKey      | 通过 key 设置某个节点的当前选中状态，使用此方法必须设置 node-key 属性 | (key) 待被选节点的 key，若为 null 则取消当前高亮的节点       |
| setCurrentNode     | 通过 node 设置某个节点的当前选中状态，使用此方法必须设置 node-key 属性 | (node) 待被选节点的 node                                     |
| getCurrentNode     | 获取当前被选中节点的 data，若没有节点被选中则返回 null       | -                                                            |
| getCurrentKey      | 获取当前被选中节点的 key，使用此方法必须设置 node-key 属性，若没有节点被选中则返回 null | -                                                            |
| getNode            | 根据 data 或者 key 拿到 Tree 组件中的 node                   | (data) 要获得 node 的 key 或者 data                          |
| filter             | 对树节点进行筛选操作                                         | 接收一个任意类型的参数，该参数会在 filter-node-method 中作为第一个参数 |
| filter-node-method |                                                              |                                                              |



### 事件

| 事件名           | 说明                                   | 回调参数                                                     |
| ---------------- | -------------------------------------- | ------------------------------------------------------------ |
| node-click       | 节点被点击时的回调                     | 共三个参数，依次为：传递给 `data` 属性的数组中该节点所对应的对象、节点对应的 Node、节点组件本身。 |
| node-contextmenu | 当某一节点被鼠标右键点击时会触发该事件 | 共四个参数，依次为：event、传递给 `data` 属性的数组中该节点所对应的对象、节点对应的 Node、节点组件本身。 |
|                  |                                        |                                                              |



### Scoped Slot

| name | 说明                                      |      |
| ---- | ----------------------------------------- | ---- |
| -    | 自定义树节点的内容，参数为 { node, data } |      |

