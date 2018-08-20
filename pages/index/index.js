import apis from '../../apis/index'
import app from '../../utils/index'

Page({
  data: {
    md: {
      nodes: []
    },
    codeRows: [],
    treeData: [],
    loadCodeError: false,
    animationData: {},
    reposPath: '',
    filePath: '',
    branches: [],
    curBranch: '',
    loading: true,
    viewType: 'md',
    viewText: '',
    viewImgSrc: ''
  },
  onLoad (option) {
    // wx.request({
    //   url: 'https://raw.githubusercontent.com/houdunwang/video/master/ThinkPHP3.1.3%E5%AE%9E%E4%BE%8B%E5%BC%80%E5%8F%91%E8%A7%86%E9%A2%91%E6%95%99%E7%A8%8B/%E5%90%8E%E7%9B%BE%E7%BD%91Thinkphp%E8%A7%86%E9%A2%91%E8%B5%84%E6%96%99(BLog%E6%A8%A1%E6%9D%BF_%E5%9B%BE%E7%89%87%E7%B1%BB_%E5%AD%97%E4%BD%93)/font.ttf',
    //   dataType: 'json',
    //   header: {
    //     'Accept': 'text/html'
    //   },
    //   success: function(res) {
    //     console.log(res)
    //   },
    //   fail: function(err){
    //     console.log(err)
    //   }
    // })
    // const repos = option.repos
    const repos = 'https://github.com/Youjingyu/vue-hap-tools'
    // const repos = 'https://github.com/vuejs/vue'
    apis.setResp(repos)
    const reposPath = repos.replace('https://github.com/', '').replace(/\/$/, '')
    this.setData({
      reposPath: reposPath,
      filePath: reposPath
    })
    apis.getReopInfo().then((res) => {
      return this.changeBranch(res.default_branch)
    }).catch(() => {
      this.data.loadCodeError = true
    })
    apis.getBranches().then((res) => {
      // github按照创建时间倒序返回branches
      // 这里按照时间从旧到新显示
      const branch = res.reverse().map((item) => {
        return item.name
      })
      this.setData({
        branches: branch
      })
    }).catch(() => {
      this.data.loadCodeError = true
    })
  },
  onReady () {
    const animation = wx.createAnimation({
      duration: 500,
      timingFunction: 'ease'
    })
    this.animation = animation
    this.setData({
      animationData: this.animation.export()
    })
  },
  showMenu () {
    this.animation.left('0rpx').step()
    this.setData({
      animationData: this.animation.export()
    })
  },
  hideMenu () {
    this.animation.left('-600rpx').step()
    this.setData({
      animationData: this.animation.export()
    })
  },
  clickCodeView () {
    this.hideMenu()
  },
  changeBranch (branch) {
    apis.setBranch(branch)
    this.setData({
      loading: true
    })
    return apis.getTree().then((tree) => {
      this.setData({
        curBranch: branch,
        treeData: tree
      })
      const readme = getReadme(tree)
      if (readme) {
        this.viewFile({
          detail: {
            url: readme.url,
            path: readme.path
          }
        })
        this.setData({
          filePath: readme.path
        })
      }
      console.log(this.data.treeData)
    })
  },
  branchPickerChange (e) {
    this.changeBranch(this.data.branches[e.detail.value])
  },
  viewFile (e) {
    const path = e.detail.path
    this.setData({
      filePath: path,
      loading: true
    })
    this.hideMenu()
    const fileInfo = getFileInfo(path)
    if (fileInfo.type === 'img') {
      this.setData({
        viewType: fileInfo.type,
        loading: false,
        viewImgSrc: apis.getImgRawPath() + path
      })
      return
    }
    // const url = e.detail.url.replace('https://api.github.com/repos/', '')
    apis.getBlob(e.detail.path).then((res) => {
    // apis.getBlob(url).then((res) => {
      this.parseFile(res, fileInfo)
    }).catch((err) => {
      if (err.code === 3) {
        this.setData({
          viewType: 'nosupport',
        })
      }
    })
  },
  parseFile (content, fileInfo, cb) {
    const { type } = fileInfo
    let dataToUpdate = {}
    if (type === 'md') {
      const that = this
      app.globalUtils.wxParse('md', 'md', content, that, 5, apis.getImgRawPath())
    } else if (type === 'language') {
      const codeRows = app.globalUtils.hightlight(content, fileInfo.languageType)
      dataToUpdate = {
        codeRows: codeRows
      }
    } else if (type === 'text') {
      dataToUpdate = {
        viewText: content
      }
    }
    this.setData(Object.assign({
      viewType: type,
      loading: false
    }, dataToUpdate))
    cb && cb()
  }
})

// function treeDataSimplify (tree) {
//   const res = []
//   tree.forEach((item) => {
//     const treeItem = {name: item.name}
//     res.push(treeItem)
//     if (item.children && item.children.length > 0) {
//       treeItem.children = treeDataSimplify(item.children)
//     }
//   })
//   return res
// }
function getReadme (tree) {
  for (let i = 0; i < tree.length; i++) {
    if (tree[i].content && /^(readme|README)\.md$/.test(tree[i].content.path)) {
      return tree[i].content
    }
  }
}
const languageMap = {
  'js': 'javascript',
  'css': 'css',
  'html': 'html',
  'ts': 'typescript',
  'json': 'json'
}
const imgMap = ['png', 'jpeg', 'jpg', 'gif']
function getFileInfo (path) {
  const fileInfo = {
    path
  }
  const matches = path.match(/\.([a-zA-Z]+)$/)
  const type = (matches && matches[1]) || ''
  if (type === 'md') {
    fileInfo.type = 'md'
  } else if (imgMap.indexOf(type) > -1) {
    fileInfo.type = 'img'
  } else if (languageMap[type]) {
    fileInfo.type = 'language'
    fileInfo.languageType = languageMap[type]
  } else {
    fileInfo.type = 'text'
  }
  return fileInfo
}
