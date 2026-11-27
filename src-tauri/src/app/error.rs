use serde::{Serialize, Serializer};

#[derive(Debug)]
pub struct CmdError(String);

pub type CmdResult<T> = Result<T, CmdError>;

impl CmdError {
    pub fn msg(message: impl Into<String>) -> Self {
        Self(message.into())
    }
}

impl From<anyhow::Error> for CmdError {
    fn from(error: anyhow::Error) -> Self {
        Self(format!("{error:#}"))
    }
}

impl From<rusqlite::Error> for CmdError {
    fn from(error: rusqlite::Error) -> Self {
        Self(error.to_string())
    }
}

impl From<std::io::Error> for CmdError {
    fn from(error: std::io::Error) -> Self {
        Self(error.to_string())
    }
}

impl From<serde_json::Error> for CmdError {
    fn from(error: serde_json::Error) -> Self {
        Self(error.to_string())
    }
}

impl Serialize for CmdError {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(&self.0)
    }
}
