// Mencegah jendela console tambahan di Windows (release)
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tradesight_lib::run()
}
