const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('qrAPI', {
  generate:        (opts)    => ipcRenderer.invoke('qr:generate',        opts),
  save:            (args)    => ipcRenderer.invoke('qr:save',            args),
  copyToClipboard: (args)    => ipcRenderer.invoke('qr:copy-clipboard',  args),
  openCsvDialog:   ()        => ipcRenderer.invoke('qr:open-csv'),
  batchGenerate:   (args)    => ipcRenderer.invoke('qr:batch-generate',  args),
  getHistory:      ()        => ipcRenderer.invoke('qr:get-history'),
  addHistory:      (entry)   => ipcRenderer.invoke('qr:add-history',     entry),
  clearHistory:    ()        => ipcRenderer.invoke('qr:clear-history'),
  getSettings:     ()        => ipcRenderer.invoke('qr:get-settings'),
  saveSettings:    (settings)=> ipcRenderer.invoke('qr:save-settings',   settings)
})
