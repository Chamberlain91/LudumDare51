import { loadAssets } from "./assets.js"

/** @type {HTMLCanvasElement} */
const canvas = document.getElementById('canvas')
canvas.height = window.innerHeight
canvas.width = window.innerWidth

/** @type {CanvasRenderingContext2D} */
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: false })

const clearScreen = () => {
    ctx.fillStyle = '#EEE'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
}

const drawRectangle = (x, y, w, h, color, isStroke = false) => {
    if (isStroke) {
        ctx.strokeStyle = color
        ctx.strokeRect(x, y, w, h)
    } else {
        ctx.fillStyle = color
        ctx.fillRect(x, y, w, h)
    }
}

const drawSprite = (x, y) => {
    ctx.fillStyle = '#F22'
    ctx.fillRect(x, y, 32, 32)
}

// Load the assets....
const assets = await loadAssets(progress => {
    // ...
    clearScreen()
    // draw a loading bar
    drawRectangle(10, 10, 500, 10, 'red', true)
    drawRectangle(10, 10, progress * 500, 10, 'red')
})

console.log(assets)

// game loop
requestAnimationFrame(function updateFrame() {
    requestAnimationFrame(updateFrame)

    // ...
    clearScreen()

    // ...
    drawSprite(Math.cos(performance.now()) * 100, 32)
})