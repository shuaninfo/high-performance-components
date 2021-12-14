<template>
  <div :class="['check-box']">
    <div class="tree-label" @click="onSingleChecked" @dblclick="onDBLChecked">
      <slot></slot>
    </div>
    <div
      v-if="showBox"
      :class="['box', { 'is-checked': checked, 'is-part-checked': indeterminate, 'is-disabled': disabled }]"
      @click="onChecked"
    ></div>
  </div>
</template>

<script>
import { depthFirstEach } from './util.js';
export default {
  model: {
    prop: 'checked',
    event: 'checked-change',
  },
  props: {
    checked: { type: Boolean, default: false },
    indeterminate: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
    checkedAction: { type: String, default: 'none' },
    showCheckbox: { type: Boolean, default: false },
    isLeaf: { type: Boolean, default: true },
    showCheckboxLeafOnly: { type: Boolean, default: false },
    node: { type: Object, default: () => {} },
    checkStriclty: { type: Boolean, default: false },
  },
  computed: {
    showBox() {
      if (this.showCheckbox) {
        if (this.showCheckboxLeafOnly) {
          return this.isLeaf;
        }
        return true;
      }
      return false;
    },
  },
  methods: {
    onChecked() {
      if (this.disabled) return;
      this.$emit('checked-change', this.getNewChecked(this.checked));
      this.$emit('on-checked');
    },
    labelClick() {
      this.$emit('on-click-label');
    },
    onSingleChecked() {
      if (this.checkedAction === 'click' && this.showBox) this.onChecked();
      this.labelClick();
    },
    onDBLChecked() {
      if (this.checkedAction === 'dblclick' && this.showBox) this.onChecked();
      this.labelClick();
    },

    getNewChecked(oldChecked) {
      // 如果是叶子或者未知(懒加载属于未知)
      if (this.node.isLeaf === true || this.node.isLeaf === undefined || this.checkStriclty) {
        return !oldChecked;
      }
      let newChecked = false;
      depthFirstEach({ tree: this.node.children }, node => {
        // 如果是叶子或者未知(懒加载属于未知)
        if ((node.isLeaf === true || node.isLeaf === undefined) && !node.disabled && !node.checked) {
          newChecked = true;
          return 'break';
        }
      });
      return newChecked;
    },
  },
};
</script>

<style lang="scss">
.check-box {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  .box {
    position: relative;
    width: 10px;
    height: 10px;
    border: 1px solid #dcdfe6;
    cursor: pointer;
    &:hover {
      border-color: #409eff;
    }
    &::after {
      content: '\2713';
      position: absolute;
      left: 0px;
      top: -5px;
      transform: scale(0);
    }
    // 子元素部分选中, check
    &.is-part-checked::after {
      content: '-';
      left: 0px;
      top: -7px;
    }
    &.is-checked,
    &.is-part-checked {
      border-color: #409eff;
      color: #409eff;
      &::after {
        transform: scale(0.9);
      }
    }
    &.is-disabled {
      background: #f2f6fc;
      color: #c0c4cc;
      border-color: #c0c4cc;
      &::after {
        cursor: not-allowed;
      }
    }
  }
}
</style>
