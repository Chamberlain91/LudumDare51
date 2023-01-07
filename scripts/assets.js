const manifest = {
    'fruits': {
        'apple': {
            'normal': 'sprites/Apple.png',
            'highlight': 'sprites/Apple_HL.png',
        },
        'banana': {
            'normal': 'sprites/Banana.png',
            'highlight': 'sprites/Banana_HL.png',
        },
        'blueberry': {
            'normal': 'sprites/Blueberry.png',
            'highlight': 'sprites/Blueberry_HL.png',
        },
        'grapes': {
            'normal': 'sprites/Green_grape.png',
            'highlight': 'sprites/Green_grape_HL.png',
        },
        'lychee': {
            'normal': 'sprites/Lychee.png',
            'highlight': 'sprites/Lychee_HL.png',
        },
        'orange': {
            'normal': 'sprites/Orange.png',
            'highlight': 'sprites/Orange_HL.png',
        },
        'strawberry': {
            'normal': 'sprites/Strawberry.png',
            'highlight': 'sprites/Strawberry_HL.png'
        },
        'watermelon': {
            'normal': 'sprites/Watermelon.png',
            'highlight': 'sprites/Watermelon_HL.png'
        }
    }
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

function loadAsset(path) {
    console.log(`Requesting '${path}'`)
    return new ImageAsset(`assets/${path}`)
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
