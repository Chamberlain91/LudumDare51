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

const title_screen_text =
    "\"Pleasant Porridge\" Kevin MacLeod (incompetech.com)\n" +
    "Licensed under Creative Commons: By Attribution 4.0 License\n" +
    "http://creativecommons.org/licenses/by/4.0/"

let showTitleScreen = true

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

// ...
const coroutineRunner = new CoroutineRunner()

let click_locations = []
let enable_input = true

let bgm_is_playing = false
window.addEventListener("click", ev => {

    if (!bgm_is_playing) {
        bgm_is_playing = true

        // Play looping BGM
        assets.music.setVolume(0.66)
        assets.music.play(true)
    }

    if (enable_input && !showTitleScreen) {
        click_locations.push([
            ev.clientX / window.innerWidth,
            ev.clientY / window.innerHeight
        ])
    }

    showTitleScreen = false
})

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

        this.wobble = 0

        this.x = 0
        this.y = 0

        this.x_previous = 0
        this.y_previous = 0
        this.x_target = 0
        this.y_target = 0

        this.fall_distance = 0
        this.delay = 0

        this.scale = 1

        this.x_vel = 0
        this.y_vel = 0
    }
}

// A list of all the fruit objects
const fruits = ["lychee", "orange", "blueberry", "grapes"]

const particles = []

// Construct square grid
const grid_size = 11
let grid = new Array(grid_size)
for (let i = 0; i < grid.length; i++) {
    grid[i] = new Array(grid_size)
}

let remaining_icons
let score

function restartGameField() {

    remaining_icons = grid_size * grid_size
    showTitleScreen = true
    score = 0

    // Create randomized fruit dispenser, with equal likelyhood of fruit
    const fruit_dispenser = []
    const total_cell_count = grid_size * grid_size
    for (let i = 0; i < total_cell_count; i++) {
        const name = fruits[i % fruits.length]
        const fruit = new Fruit(name, assets.fruits[name])
        fruit_dispenser.push(fruit)
    }
    shuffle(fruit_dispenser)

    // Place fruit into grid
    for (let y = 0; y < grid_size; y++) {
        for (let x = 0; x < grid_size; x++) {
            const fruit = grid[y][x] = fruit_dispenser.pop()
            fruit.x = x * 32
            fruit.y = y * 32
        }
    }
}

restartGameField()

function collapseGrid() {

    function collapseVertical() {

        // ...
        for (let y = 0; y < grid_size; y++) {
            for (let x = 0; x < grid_size; x++) {
                const cell = grid[y][x]
                if (cell) {
                    cell.fall_distance = grid_size - y
                }
            }
        }

        for (let x = 0; x < grid_size; x++) {

            let num_falling = 0
            for (let y = grid_size - 1; y >= 0; y--) {

                if (grid[y][x] != undefined) {

                    // look down for spaces to skip
                    for (let y2 = y + 1; y2 <= grid_size; y2++) {
                        if (y2 == grid_size || grid[y2][x] != undefined) {
                            const offset = y2 - y - 1
                            if (offset > 0) {
                                grid[y][x].fall_distance = num_falling
                                grid[y + offset][x] = grid[y][x]
                                grid[y][x] = undefined
                                num_falling++
                            }
                            break
                        }
                    }
                }
            }
        }
    }

    function collapseHorizontal() {

        for (let x = grid_size - 1; x >= 1; x--) {

            let empty = true
            for (let y = 0; y < grid_size; y++) {
                if (grid[y][x - 1] != undefined) {
                    empty = false
                    break
                }
            }

            if (empty) {
                for (let y = 0; y < grid_size; y++) {
                    for (let x2 = x; x2 < grid_size; x2++) {
                        grid[y][x2 - 1] = grid[y][x2]
                        grid[y][x2] = undefined
                    }
                }
            }
        }
    }

    collapseVertical()
    collapseHorizontal()
}

let lastFrameTime = performance.now()
// let currentTime = 0
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
        const game_width = 32 * grid_size
        const game_height = game_width

        // Compute minimum view size
        const view_zoom_width = game_width + 64
        const view_zoom_height = game_height + 64

        // Compute and set pixel zoom to make play space larger on screen
        const view_zoom = Math.min(canvas.width, canvas.height) / Math.min(view_zoom_width, view_zoom_height)
        ctx.scale(view_zoom, view_zoom)

        // Compute the size of screen in zoom coordinates
        const view_width = canvas.width / view_zoom
        const view_height = canvas.height / view_zoom

        // Compute view rect transform
        const game_offset_x = (view_width - game_width) / 2
        const game_offset_y = (view_height - game_height) / 2 - 16

        if (showTitleScreen) {

            ctx.fillStyle = "rgba(0,0,0,0.5)"
            ctx.font = "10px Itim, cursive"
            ctx.textAlign = "center"
            const lines = title_screen_text.split('\n')
            for (var i = 0; i < lines.length; i++) {
                ctx.fillText(lines[lines.length - i - 1], game_offset_x + game_width / 2, view_height - ((i + 1) * 12))
            }

            ctx.font = "30px Itim, cursive"

            const begin_text = "Click To Begin"
            const begin_text_measure = ctx.measureText(begin_text)

            const w = begin_text_measure.width
            const h = begin_text_measure.actualBoundingBoxAscent + begin_text_measure.actualBoundingBoxDescent
            const y = -begin_text_measure.actualBoundingBoxAscent / 2

            drawRectangle((view_width - w) / 2 - 12, (view_height - 20) / 2 + y - 8, w + 24, h + 12, 'rgba(255,255,255,0.75)', 0, 4)
            drawRectangle((view_width - w) / 2 - 12, (view_height - 20) / 2 + y - 8, w + 24, h + 12, 'rgba(0,0,0,0.5)', 1, 4)

            ctx.fillStyle = "rgba(33,182,112,0.8)"
            ctx.fillText(begin_text, view_width / 2, view_height / 2)

        } else {
            // Draw a dark rectangle to give contrast to the icons
            drawRectangle(game_offset_x - 8, game_offset_y - 8, game_width + 16, game_height + 16, 'rgba(255,255,255,0.5)', 0, 8)
            drawRectangle(game_offset_x - 8, game_offset_y - 8, game_width + 16, game_height + 16, 'rgba(0,0,0,0.5)', 1, 8)

            // Draw the grid sprites
            for (let y = 0; y < grid_size; y++) {
                for (let x = 0; x < grid_size; x++) {
                    const cell = grid[y][x]
                    if (cell) {
                        drawSprite(cell.image, game_offset_x + cell.x, game_offset_y + cell.y)
                    }
                }
            }

            for (const particle of particles) {
                drawSprite(particle.image, game_offset_x + particle.x, game_offset_y + particle.y)
            }

            const score_text = `Score: ${score}`
            ctx.fillStyle = "rgba(255,255,255,0.8)"
            ctx.font = "20px Itim, cursive"
            ctx.textAlign = "right"
            ctx.fillText(score_text, game_offset_x + game_width, game_offset_y + game_height + 28)
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

            // ...
            const cluster = detectCluster(grid, cell_x, cell_y, (a, b) => a.name == b.name)
            if (cluster.length > 0) {
                coroutineRunner.begin(function* () {

                    // Prevent user input while animating
                    enable_input = false

                    // Scoring
                    if (cluster.length > 0) {
                        if (cluster.length == 1) { score -= 100 }
                        else { score += (25 * cluster.length) + Math.floor(Math.pow(cluster.length, cluster.length / 10)) }
                    }

                    // ...
                    remaining_icons -= cluster.length

                    // Pop off the fruit from the grid, one by one
                    let pop_count = 0
                    while (cluster.length > 0) {

                        // Get the next fruit to remove
                        const [x, y] = cluster.pop()

                        // Move fruit to particles, giving it some random velocity
                        const cell = grid[y][x]
                        if (cell) {
                            cell.x_vel = (Math.random() * 2 - 1) * 3
                            cell.y_vel = (Math.random() * 2 - 1) * 3
                            particles.push(cell)
                        }

                        // Clear the fruit from the grid
                        grid[y][x] = undefined

                        // Play the pop sound
                        assets.pop[pop_count].play()
                        if (pop_count < 9) pop_count++

                        // Wait a small delay (animation)
                        yield (5 * pop_count) / 1000
                    }

                    // Shift the grid data
                    collapseGrid()

                    // Animate the icons to match grid data
                    const total_time = .6
                    const slide_time = .4
                    const delay_time = total_time - slide_time

                    // Get animation targets
                    for (let y = 0; y < grid_size; y++) {
                        for (let x = 0; x < grid_size; x++) {
                            const cell = grid[y][x]
                            if (cell) {

                                // ...
                                cell.x_previous = cell.x
                                cell.y_previous = cell.y

                                // ...
                                cell.x_target = x * 32
                                cell.y_target = y * 32

                                // ...
                                cell.delay = (cell.fall_distance / grid_size) * delay_time
                            }
                        }
                    }

                    const lerp = (a, b, t) => a + (b - a) * t

                    const tween = k => {
                        if (k < (1 / 2.75)) {
                            return 7.5625 * k * k
                        } else if (k < (2 / 2.75)) {
                            return 7.5625 * (k -= (1.5 / 2.75)) * k + 0.75
                        } else if (k < (2.5 / 2.75)) {
                            return 7.5625 * (k -= (2.25 / 2.75)) * k + 0.9375
                        } else {
                            return 7.5625 * (k -= (2.625 / 2.75)) * k + 0.984375
                        }
                    }

                    let anim_time = 0
                    while (anim_time < total_time) {

                        // const t = tween(anim_time / slide_time)
                        anim_time += deltaTime

                        // Place icon in interpolated position
                        for (let y = 0; y < grid_size; y++) {
                            for (let x = 0; x < grid_size; x++) {
                                const cell = grid[y][x]
                                if (cell) {
                                    const k = (anim_time - cell.delay) / slide_time
                                    if (k > 0) {
                                        if (k < 1) {
                                            const t = tween(k)
                                            cell.x = lerp(cell.x_previous, cell.x_target, t)
                                            cell.y = lerp(cell.y_previous, cell.y_target, t)
                                        } else {
                                            cell.x = cell.x_target
                                            cell.y = cell.y_target
                                        }
                                    }
                                }
                            }
                        }

                        yield null
                    }

                    // Place in final position, exactly.
                    for (let y = 0; y < grid_size; y++) {
                        for (let x = 0; x < grid_size; x++) {
                            const cell = grid[y][x]
                            if (cell) {
                                cell.x = cell.x_target
                                cell.y = cell.y_target
                            }
                        }
                    }

                    if (remaining_icons == 0) {
                        yield 5
                        restartGameField()
                    }

                    // Allow user to click again
                    enable_input = true
                })
            }
        }

        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i]

            particle.y_vel += 50 * deltaTime
            particle.x += particle.x_vel
            particle.y += particle.y_vel

            if (particle.y > view_height) {
                particles.splice(i, 1)
            }
        }

        // // Draw the click coordinate
        // const wobble_x = Math.cos(currentTime * 8)
        // drawRectangle(game_offset_x + (cell_x * 32) + wobble_x, game_offset_y + (cell_y * 32) + wobble_x, 32 - wobble_x * 2, 32 - wobble_x * 2, 'rgba(0,0,0,0.5)', 1, 2)

        // ...
        coroutineRunner.update(deltaTime)

        // Compute per frame timing information
        const currentFrameTime = performance.now()
        deltaTime = (currentFrameTime - lastFrameTime) / 1000
        // currentTime += deltaTime
        lastFrameTime = currentFrameTime

        // Draw debug FPS
        ctx.fillStyle = "skyblue"
        ctx.font = "10px Itim, cursive"
        ctx.textAlign = "left"
        ctx.fillText(`FPS: ${Math.floor(1 / deltaTime)}`, 10, 20)

        // Schedule next frame
        requestAnimationFrame(updateFrame)

    } catch (e) {

        console.error("GAME LOOP ABORTED")
        console.error(e)

    }
})