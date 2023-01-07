import { detectCluster, CoroutineRunner } from "./game.js"
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

    const bar_width = Math.min(500, canvas.width - 32)
    const bar_height = 20
    const bar_offset_x = (canvas.width - bar_width) / 2
    const bar_offset_y = (canvas.height - bar_height) / 2

    // Draw a basic loading bar
    drawRectangle(bar_offset_x, bar_offset_y, bar_width, bar_height, 'red', true)
    drawRectangle(bar_offset_x, bar_offset_y, progress * bar_width, bar_height, 'red')
})

console.debug(assets)

let click_locations = []

let bgm_is_playing = false
window.addEventListener("click", ev => {

    if (!bgm_is_playing) {
        bgm_is_playing = true

        // Play looping BGM
        assets.music.setVolume(0.66)
        assets.music.play(true)
    }

    // ...
    click_locations.push([
        ev.clientX / window.innerWidth,
        ev.clientY / window.innerHeight
    ])
})

function selectRandom(array) {
    const index = (Math.random() * array.length) | 0
    return array[index]
}

function shuffle(array) {

    function swap(a, b) {
        let t = array[a]
        array[a] = array[b]
        array[b] = t
    }

    for (let i = 0; i < array.length; i++) {
        const index = (Math.random() * array.length) | 0
        swap(index, i)
    }
}

class Fruit {
    constructor(name, image) {
        this.image = image
        this.name = name
    }
}

// A list of all the fruit objects
const fruits = ["lychee", "orange", "blueberry", "grapes"].map(name => {
    const image = assets.fruits[name]
    return new Fruit(name, image)
})

console.log(fruits)

// Construct square grid
const grid_cell_size = 10
let grid = new Array(grid_cell_size)
for (let i = 0; i < grid.length; i++) {
    grid[i] = new Array(grid_cell_size)
}

// Create randomized fruit dispenser, with equal likelyhood of fruit
const fruit_dispenser = []
const total_cell_count = grid_cell_size * grid_cell_size
for (let i = 0; i < total_cell_count; i++) {
    fruit_dispenser.push(fruits[i % fruits.length])
}
shuffle(fruit_dispenser)

// Place fruit into grid
for (let y = 0; y < grid_cell_size; y++) {
    for (let x = 0; x < grid_cell_size; x++) {
        grid[y][x] = fruit_dispenser.pop()
    }
}

const coroutineRunner = new CoroutineRunner()

let lastFrameTime = performance.now()
let currentTime = 0
let deltaTime = 0

let cell_x = 0
let cell_y = 0

// The main game loop
requestAnimationFrame(function updateFrame() {
    try {

        // DRAW GAME STATE

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

        // Size of the play space
        const game_width = 32 * grid_cell_size
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
        drawRectangle(game_offset_x - 8, game_offset_y - 8, game_width + 16, game_height + 16, 'rgba(255,255,255,0.5)', 0, 8)
        drawRectangle(game_offset_x - 8, game_offset_y - 8, game_width + 16, game_height + 16, 'rgba(0,0,0,0.5)', 1, 8)

        // Draw the grid sprites
        for (let y = 0; y < grid_cell_size; y++) {
            for (let x = 0; x < grid_cell_size; x++) {
                const cell = grid[y][x]
                if (cell) {
                    drawSprite(cell.image, game_offset_x + (x * 32), game_offset_y + (y * 32))
                }
            }
        }

        // UPDATE LOGIC

        while (click_locations.length > 0) {
            const [nx, ny] = click_locations.pop()

            // Compute the click coordinates in the game space
            const click_x = nx * view_width
            const click_y = ny * view_height

            // Don't process clicks outside the game area
            if (click_x < game_offset_x || click_x > (game_offset_x + game_width)) { continue }
            if (click_y < game_offset_y || click_y > (game_offset_y + game_height)) { continue }

            // Get the cell index clicked on
            cell_x = ((click_x - game_offset_x) / 32) | 0
            cell_y = ((click_y - game_offset_y) / 32) | 0

            coroutineRunner.begin(function* () {
                console.log("A")
                yield 1
                console.log("B")
                yield 1
                console.log("C")
                yield 1
            })

            // ...
            for (const [x, y] of detectCluster(grid, cell_x, cell_y)) {
                grid[y][x] = undefined
            }
        }

        // Draw the click coordinate
        const wobble_x = Math.cos(currentTime * 8)
        drawRectangle(game_offset_x + (cell_x * 32) + wobble_x, game_offset_y + (cell_y * 32) + wobble_x, 32 - wobble_x * 2, 32 - wobble_x * 2, 'rgba(0,0,0,0.5)', 1, 2)

        // ...
        coroutineRunner.update(deltaTime)

        // Compute per frame timing information
        const currentFrameTime = performance.now()
        deltaTime = (currentFrameTime - lastFrameTime) / 1000
        currentTime += deltaTime
        lastFrameTime = currentFrameTime

        // Draw debug FPS
        ctx.fillStyle = "skyblue"
        ctx.fillText(`FPS: ${Math.floor(1 / deltaTime)}`, 10, 20)

        // Schedule next frame
        requestAnimationFrame(updateFrame)

    } catch (e) {

        console.error("GAME LOOP ABORTED")
        console.error(e)

    }
})