import { loadAssets } from "./assets.js"

/** @type {HTMLCanvasElement} */
const canvas = document.getElementById('canvas')

function setCanvasToWindow() {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
}

// Set the window to use the canvas size
setCanvasToWindow()

// When the window resizes, adjust canvas size
window.addEventListener("resize", setCanvasToWindow)

try {
    // LOCK INTO PORTRAIT MODE
    await screen.orientation.lock("portrait")
} catch {
    // Not supported, oh well
}

/** @type {CanvasRenderingContext2D} */
const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })

const clearScreen = () => {
    ctx.fillStyle = '#223'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
}

const drawRectangle = (x, y, w, h, color, lineWidth = 0, lineRadius = 0) => {
    ctx.beginPath()
    if (lineRadius > 0) {
        ctx.roundRect(x, y, w, h, lineRadius)
    } else {
        ctx.rect(x, y, w, h)
    }
    if (lineWidth > 0) {
        ctx.strokeStyle = color
        ctx.stroke()
    } else {
        ctx.fillStyle = color
        ctx.fill()
    }
    ctx.beginPath()
}

const drawSprite = (img, x, y, w = undefined, h = undefined) => {
    if (w === undefined) { w = img.asset.width }
    if (h === undefined) { h = img.asset.height }
    ctx.drawImage(img.asset, x, y, w, h)
}

// Load the assets...
const assets = await loadAssets(progress => {

    // Clears the screen
    clearScreen()

    const bar_width = 500
    const bar_height = 20
    const bar_offset_x = (canvas.width - bar_width) / 2
    const bar_offset_y = (canvas.height - bar_height) / 2

    // Draw a basic loading bar
    drawRectangle(bar_offset_x, bar_offset_y, bar_width, bar_height, 'red', true)
    drawRectangle(bar_offset_x, bar_offset_y, progress * bar_width, bar_height, 'red')
})

console.debug(assets)

function selectRandom(array) {
    const index = (Math.random() * array.length) | 0
    return array[index]
}

class Fruit {
    constructor(name, image) {
        this.image = image
        this.name = name
    }
}

// A list of all the fruit objects
const fruits = ["orange", "banana", "grapes", "lychee"].map(name => {
    const images = assets.fruits[name]
    return new Fruit(name, images.normal)
})

console.log(fruits)

// Construct square grid
const grid_size = 10
let grid = new Array(grid_size)
for (let i = 0; i < grid.length; i++) {
    grid[i] = new Array(grid_size)
}

// ...
for (let y = 0; y < grid_size; y++) {
    for (let x = 0; x < grid_size; x++) {
        grid[y][x] = selectRandom(fruits)
    }
}

let lastFrameTime = performance.now()
let deltaTime = 0

// The main game loop
requestAnimationFrame(function updateFrame() {
    try {

        // Compute background "stretch to fill" ratio
        const background = assets.background.grass
        const background_zoom = Math.max(canvas.width, canvas.height) / Math.max(background.asset.width, background.asset.height)

        // Compute background rect transform
        const background_width = background.asset.width * background_zoom
        const background_height = background.asset.height * background_zoom
        const background_offset_x = (canvas.width - background_width) / 2
        const background_offset_y = (canvas.height - background_height) / 2

        // Clear transform state (no zoom)
        ctx.resetTransform()

        // Draw the backround image, stretched to fill the screen (clear screen step)
        drawSprite(background, background_offset_x, background_offset_y, background_width, background_height)

        // Size of the place space
        const game_width = 32 * grid_size
        const game_height = game_width

        // Compute minimum view size
        const view_zoom_width = game_width + 32
        const view_zoom_height = game_height + 32

        // Compute and set pixel zoom to make play space larger on screen
        const view_zoom = Math.min(canvas.width, canvas.height) / Math.min(view_zoom_width, view_zoom_height)
        ctx.scale(view_zoom, view_zoom)

        // Compute the size of screen in zoom coordinates
        const view_width = canvas.width / view_zoom
        const view_height = canvas.height / view_zoom

        // Compute view rect transform
        const game_offset_x = (view_width - game_width) / 2
        const game_offset_y = (view_height - game_height) / 2

        // Draw a dark rectangle to give contrast to the icons
        drawRectangle(game_offset_x - 8, game_offset_y - 8, game_width + 16, game_height + 16, 'rgba(0,0,0,0.8)', 0, 8)

        // Draw the grid sprites
        for (let y = 0; y < grid_size; y++) {
            for (let x = 0; x < grid_size; x++) {
                drawSprite(grid[y][x].image, game_offset_x + (x * 32), game_offset_y + (y * 32))
            }
        }

        // Compute per frame timing information
        const currentFrameTime = performance.now()
        deltaTime = (currentFrameTime - lastFrameTime) / 1000
        lastFrameTime = currentFrameTime

        // Draw debug FPS
        ctx.fillStyle = "blue"
        ctx.fillText(`FPS: ${Math.floor(1 / deltaTime)}`, 10, 20)

        // Schedule next frame
        requestAnimationFrame(updateFrame)

    } catch (e) {

        console.error("GAME LOOP ABORTED")
        console.error(e)

    }
})