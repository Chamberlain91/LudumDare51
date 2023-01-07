const manifest = {
    'fruits': {
        'apple': 'sprites/Apple.png',
        'banana': 'sprites/Banana.png',
        'blueberry': 'sprites/Blueberry.png',
        'grapes': 'sprites/Green_grape.png',
        'lychee': 'sprites/Lychee.png',
        'orange': 'sprites/Tangeriene.png',
        'strawberry': 'sprites/Strawberry.png',
        'watermelon': 'sprites/Watermelon.png',
        'cranberry': 'sprites/Cranberry.png',

    },
    'background': {
        'forest': 'background-forest.png',
        'grass': 'background-grass.png'
    },
    'music': "pleasant_porridge.mp3"
}

class Asset {
}

class ImageAsset extends Asset {

    constructor(path) {
        super()
        this.asset = ImageAsset._loadAsset(path)
    }

    static async _loadAsset(path) {
        // Request content at URL
        const response = await fetch(path, { method: 'GET' })

        // If the request was a success...
        if (response.status == 200) {

            // Get the data as a blob
            console.log(`Downloaded '${path}'`)
            const blob = await response.blob()

            // Construct image asset
            const img = new Image()
            img.src = URL.createObjectURL(blob)
            return img
        }
        else {
            throw new Error(`UNABLE TO LOAD '${path}'`)
        }
    }
}

class AudioAsset extends Asset {

    constructor(path) {
        super()
        this.asset = AudioAsset._loadAsset(path)
    }

    play(looping = false) {
        this.asset.currentTime = 0
        this.asset.loop = looping
        this.asset.play()
    }

    setVolume(volume) {
        this.asset.volume = volume
    }

    static async _loadAsset(path) {
        // Request content at URL
        const response = await fetch(path, { method: 'GET' })

        // If the request was a success...
        if (response.status == 200) {

            // Get the data as a blob
            console.log(`Downloaded '${path}'`)
            const blob = await response.blob()

            // Construct audio asset
            const audio = new Audio()
            audio.src = URL.createObjectURL(blob)
            return audio
        }
        else {
            throw new Error(`UNABLE TO LOAD '${path}'`)
        }
    }
}

const image_extensions = new Set(["png", "jpg"])
const audio_extensions = new Set(["mp3", "ogg", "wav"])

function loadAsset(path) {
    const ext = path.split('.').pop()
    console.log(`Requesting '${path}' (${ext})`)
    if (image_extensions.has(ext)) {
        return new ImageAsset(`assets/${path}`)
    } else if (audio_extensions.has(ext)) {
        return new AudioAsset(`assets/${path}`)
    } else {
        throw new Error("Unknown asset type.")
    }
}

function loadAssetGroup(group) {
    const resources = {}
    for (const [name, value] of Object.entries(group)) {
        if (typeof value == "string") {
            resources[name] = loadAsset(value)
        } else {
            resources[name] = loadAssetGroup(value)
        }
    }
    return resources
}

async function loadAssets(progressCallback) {

    function flatten(data) {
        let arr = []
        for (const val of Object.values(data)) {
            if (val instanceof Asset) {
                arr.push(val)
            } else {
                // if(typeof val =="")
                arr.push(...flatten(val))
            }
        }
        return arr
    }

    // ...
    progressCallback(0)

    // tree of promises (to resources)
    const resources = loadAssetGroup(manifest)

    // ...
    let count = 0
    const awaitables = flatten(resources)
    for (const resource of awaitables) {
        resource.asset = await resource.asset
        progressCallback(count / awaitables.length)
        count++
    }

    return resources
}

export { loadAssets }
